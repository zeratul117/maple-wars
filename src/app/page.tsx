"use client";

import React, { useMemo, useState } from "react";
import type {
  ActionMenu,
  CombatPreview,
  CommanderId,
  Point,
  Screen,
  Side,
  Tile,
  TurnSnapshot,
  Unit,
  UnitTooltip,
  UnitType,
} from "../game/types";
import {
  COMMANDER_IDS,
  DIRECTIONS,
  H,
  MAX_HP,
  TILE,
  W,
} from "../game/constants";
import { commanders } from "../game/data/commanders";
import { makeMap } from "../game/data/map";
import { terrainDefs } from "../game/data/terrain";
import { unitDefs } from "../game/data/units";
import { CharacterSelect } from "../game/components/CharacterSelect";
import { HomeScreen } from "../game/components/HomeScreen";
import { GameScreen } from "../game/components/GameScreen";
import { canCapture, dist, isCapturableTerrain, isProductionTerrain, key, sideLabel, unitAt } from "../game/rules/common";
import { canProduceUnit } from "../game/rules/production";
import { canEndMovementOn, effectiveMove, pathMoveCost, pathTo, reachable } from "../game/rules/movement";
import { damagePercent } from "../game/rules/combat";
import { createFreshGameState, startingFunds } from "../game/rules/economy";
import { resolveCapture } from "../game/rules/capture";
import { runAiTurn } from "../game/ai/runAiTurn";

// Rule helpers live in game/rules. This file now focuses on state, actions, AI, and rendering.

export default function Page() {
  const [screen, setScreen] = useState<Screen>("home");
  const [playerCommander, setPlayerCommander] = useState<CommanderId>("nova");
  const [aiCommander, setAiCommander] = useState<CommanderId>("ember");
  const [tiles, setTiles] = useState(makeMap);
  const [units, setUnits] = useState<Unit[]>([]);
  const [turn, setTurn] = useState<Side>("player");
  const [day, setDay] = useState(1);
  const [funds, setFunds] = useState(() => startingFunds(makeMap()));
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedProductionTile, setSelectedProductionTile] = useState<Tile | null>(null);
  const [unitTooltip, setUnitTooltip] = useState<UnitTooltip | null>(null);
  const [hoverTile, setHoverTile] = useState<Tile | null>(null);
  const [drawnPath, setDrawnPath] = useState<Point[]>([]);
  const [movingUnitId, setMovingUnitId] = useState<number | null>(null);
  const [combatPreview, setCombatPreview] = useState<CombatPreview | null>(null);
  const [actionMenu, setActionMenu] = useState<ActionMenu | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<null | "turn" | "game">(null);
  const [turnSnapshot, setTurnSnapshot] = useState<TurnSnapshot>(() => {
    const fresh = createFreshGameState();
    return { tiles: fresh.tiles, units: fresh.units, funds: fresh.funds, day: fresh.day };
  });
  const [message, setMessage] = useState("No units yet. Starting funds are based on controlled buildings. Click a blue factory to build your first ground unit.");

  // Derived state used by movement, targeting, and UI overlays.
  const selectedUnit = units.find(u => u.id === selectedUnitId) ?? null;
  const tooltipUnit = unitTooltip ? units.find(u => u.id === unitTooltip.unitId) ?? null : null;
  const reach = useMemo(() => selectedUnit && turn === "player" && !selectedUnit.acted && !selectedUnit.moved ? reachable(selectedUnit, units, tiles) : new Map<string, number>(), [selectedUnit, units, tiles, turn]);
  const attackableEnemyIds = useMemo(() => {
    if (!selectedUnit || selectedUnit.acted) return new Set<number>();
    const candidatePositions = selectedUnit.moved
      ? [selectedUnit]
      : [...reach.keys()]
        .map(s => { const [x, y] = s.split(",").map(Number); return { x, y }; })
        .filter(pos => canEndMovementOn(selectedUnit, pos, units));
    return new Set(units
      .filter(enemy => enemy.side === "ai")
      .filter(enemy => candidatePositions.some(pos => dist(pos, enemy) <= unitDefs[selectedUnit.type].range))
      .map(enemy => enemy.id));
  }, [selectedUnit, reach, units]);
  const hoverEnemy = selectedUnit && hoverTile ? units.find(u => u.side === "ai" && u.x === hoverTile.x && u.y === hoverTile.y && attackableEnemyIds.has(u.id)) : null;
  const hoverAttackMoveTarget = selectedUnit && hoverEnemy ? getAdjacentMoveTarget(selectedUnit, hoverEnemy) : null;
  const canHoverMoveHere = selectedUnit && hoverTile && reach.has(key(hoverTile.x, hoverTile.y)) && canEndMovementOn(selectedUnit, hoverTile, units);
  const arrowPath = actionMenu?.lockedPath ?? (drawnPath.length > 1 ? drawnPath : (selectedUnit && hoverAttackMoveTarget ? pathTo(selectedUnit, hoverAttackMoveTarget, reach) : (canHoverMoveHere ? pathTo(selectedUnit, hoverTile!, reach) : [])));
  const playerHQ = [...tiles.values()].some(t => t.type === "hq" && t.owner === "player");
  const aiHQ = [...tiles.values()].some(t => t.type === "hq" && t.owner === "ai");

  // Day 1 starts with no units, so do not check unit elimination yet.
  // This gives both the player and the AI a chance to take their first turn and build.
  const shouldCheckUnitElimination = day > 1;
  const playerHasUnits = units.some(u => u.side === "player" && u.hp > 0);
  const aiHasUnits = units.some(u => u.side === "ai" && u.hp > 0);

  const winner =
    !aiHQ
      ? "Blue wins!"
      : !playerHQ
        ? "Red wins!"
        : shouldCheckUnitElimination && !aiHasUnits
          ? "Blue wins!"
          : shouldCheckUnitElimination && !playerHasUnits
            ? "Red wins!"
            : null;

  // Screen / selection helpers.
  function chooseCommander(id: CommanderId) {
    const options = COMMANDER_IDS.filter(c => c !== id);
    const randomAI = options[Math.floor(Math.random() * options.length)];
    setPlayerCommander(id);
    setAiCommander(randomAI);
    const fresh = createFreshGameState();
    setTiles(fresh.tiles);
    setUnits(fresh.units);
    setTurn(fresh.turn);
    setDay(fresh.day);
    setFunds(fresh.funds);
    setSelectedUnitId(null);
    setSelectedProductionTile(null);
    setUnitTooltip(null);
    setCombatPreview(null);
    setDrawnPath([]);
    setMessage(`${commanders[id].name} vs ${commanders[randomAI].name}. Starting funds come from controlled buildings. Build your first unit from a blue factory.`);
    setTurnSnapshot({ tiles: fresh.tiles, units: fresh.units, funds: fresh.funds, day: fresh.day });
    setScreen("game");
  }

  function commanderFor(side: Side) { return side === "player" ? playerCommander : aiCommander; }

  function cancelSelection() {
    setSelectedUnitId(null);
    setSelectedProductionTile(null);
    setCombatPreview(null);
    setActionMenu(null);
    setUnitTooltip(null);
    setDrawnPath([]);
    setMessage("Selection cancelled.");
  }

  function captureIfPossible(moved: Unit, nextTiles: Map<string, Tile>) {
    const tile = nextTiles.get(key(moved.x, moved.y))!;
    const result = resolveCapture(moved, tile);

    if (!result) return false;

    nextTiles.set(key(moved.x, moved.y), result.tile);
    setMessage(result.message);
    return result.stillCapturing;
  }

  function getAdjacentMoveTarget(attacker: Unit, enemy: Unit) {
    const currentPathEnd = drawnPath[drawnPath.length - 1];
    if (
      currentPathEnd &&
      reach.has(key(currentPathEnd.x, currentPathEnd.y)) &&
      canEndMovementOn(attacker, currentPathEnd, units) &&
      dist(currentPathEnd, enemy) <= unitDefs[attacker.type].range &&
      pathMoveCost(drawnPath, tiles, attacker) <= effectiveMove(attacker)
    ) {
      return currentPathEnd;
    }

    const options = DIRECTIONS.map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy }));
    return options
      .filter(p => reach.has(key(p.x, p.y)) && canEndMovementOn(attacker, p, units))
      .sort((a, b) => dist(a, attacker) - dist(b, attacker))[0] ?? null;
  }

  function openActionMenu(tile: Tile, enemy?: Unit, moveTarget?: Point, event?: React.MouseEvent<HTMLButtonElement>) {
    const board = event?.currentTarget.parentElement?.getBoundingClientRect();
    const mouseX = board && event ? event.clientX - board.left : tile.x * TILE + TILE + 8;
    const mouseY = board && event ? event.clientY - board.top : tile.y * TILE + 8;
    const left = Math.min(mouseX + 8, W * TILE - 150);
    const top = Math.min(mouseY + 8, H * TILE - 115);
    const target = moveTarget ?? (!enemy ? tile : null);
    const lockedPath = selectedUnit && target && reach.has(key(target.x, target.y)) ? getPathForTarget(target) : [];
    setActionMenu({ x: left, y: top, tile, enemy, moveTarget, lockedPath });
  }

  // Player movement, capture, and combat actions.
  function moveSelectedUnit(target: Point, doCapture = false) {
    if (!selectedUnit || !canEndMovementOn(selectedUnit, target, units)) return;

    const finalPath = getPathForTarget(target);
    const finalSpot = { ...selectedUnit, x: target.x, y: target.y, moved: false, acted: true };

    const finishAction = () => {
      const nextTiles = new Map(tiles);
      const stillCapturing = doCapture ? captureIfPossible(finalSpot, nextTiles) : false;
      setTiles(nextTiles);
      setUnits(prev => prev.map(u =>
        u.id === selectedUnit.id
          ? { ...finalSpot, capturing: stillCapturing }
          : u
      ));
      setMovingUnitId(null);
      setSelectedUnitId(null);
      setHoverTile(null);
      setDrawnPath([]);
      if (!doCapture) setMessage(`${unitDefs[selectedUnit.type].name} moved.`);
    };

    setActionMenu(null);
    setMovingUnitId(selectedUnit.id);
    setSelectedUnitId(null);
    setHoverTile(null);
    setDrawnPath([]);
    setMessage(doCapture ? `${unitDefs[selectedUnit.type].name} is capturing...` : `${unitDefs[selectedUnit.type].name} is moving...`);

    if (finalPath.length <= 1) {
      finishAction();
      return;
    }

    finalPath.slice(1).forEach((step, index) => {
      window.setTimeout(() => {
        const isLast = index === finalPath.length - 2;
        setUnits(prev => prev.map(u =>
          u.id === selectedUnit.id
            ? { ...u, x: step.x, y: step.y, moved: false, acted: isLast, capturing: false }
            : u
        ));
        if (isLast) finishAction();
      }, 120 * (index + 1));
    });
  }

  function previewAttack(enemy: Unit, moveTarget?: Point) {
    if (!selectedUnit) return;
    const originalPosition = { x: selectedUnit.x, y: selectedUnit.y };
    const attackerAtTarget = moveTarget ? { ...selectedUnit, x: moveTarget.x, y: moveTarget.y } : selectedUnit;
    const showPreview = (attacker: Unit) => {
      const atk = damagePercent(attacker, enemy, tiles);
      const defenderHpAfterHit = Math.max(0, enemy.hp - Math.ceil(atk / MAX_HP));
      const damagedDefender = { ...enemy, hp: defenderHpAfterHit };
      const canCounter = defenderHpAfterHit > 0 && dist(enemy, attacker) <= unitDefs[enemy.type].range;
      const counter = canCounter ? damagePercent(damagedDefender, attacker, tiles) : 0;
      setCombatPreview({ attacker, defender: enemy, atk, counter, returnTo: moveTarget ? originalPosition : undefined });
      setMessage("Confirm the attack after checking the damage preview.");
    };

    setActionMenu(null);

    if (moveTarget && (selectedUnit.x !== moveTarget.x || selectedUnit.y !== moveTarget.y)) {
      const finalPath = getPathForTarget(moveTarget);
      setMovingUnitId(selectedUnit.id);
      setSelectedUnitId(null);
      setHoverTile(null);
      setDrawnPath([]);
      setMessage(`${unitDefs[selectedUnit.type].name} is moving into attack position...`);
      finalPath.slice(1).forEach((step, index) => {
        window.setTimeout(() => {
          const isLast = index === finalPath.length - 2;
          setUnits(prev => prev.map(u => u.id === selectedUnit.id ? { ...u, x: step.x, y: step.y, moved: isLast, acted: false } : u));
          if (isLast) {
            setMovingUnitId(null);
            setSelectedUnitId(selectedUnit.id);
            showPreview(attackerAtTarget);
          }
        }, 120 * (index + 1));
      });
      return;
    }

    showPreview(attackerAtTarget);
  }

  function handleTileHover(tile: Tile) {
    setHoverTile(tile);

    if (!selectedUnit || selectedUnit.acted || selectedUnit.moved || actionMenu) return;
    if (!reach.has(key(tile.x, tile.y)) || !canEndMovementOn(selectedUnit, tile, units)) return;

    setDrawnPath(prev => {
      const start = { x: selectedUnit.x, y: selectedUnit.y };
      const tilePoint = { x: tile.x, y: tile.y };
      const tileKey = key(tile.x, tile.y);
      const startKey = key(start.x, start.y);

      if (prev.length === 0 || key(prev[0].x, prev[0].y) !== startKey) {
        return pathTo(start, tilePoint, reach);
      }

      const existingIndex = prev.findIndex(p => key(p.x, p.y) === tileKey);
      if (existingIndex >= 0) {
        return prev.slice(0, existingIndex + 1);
      }

      const last = prev[prev.length - 1];
      if (dist(last, tilePoint) === 1) {
        const proposedPath = [...prev, tilePoint];
        if (pathMoveCost(proposedPath, tiles, selectedUnit) <= effectiveMove(selectedUnit)) {
          return proposedPath;
        }
      }

      return pathTo(start, tilePoint, reach);
    });
  }

  function getPathForTarget(target: Point) {
    const last = drawnPath[drawnPath.length - 1];
    if (selectedUnit && last && last.x === target.x && last.y === target.y && drawnPath.length > 1) {
      if (pathMoveCost(drawnPath, tiles, selectedUnit) <= effectiveMove(selectedUnit)) return drawnPath;
    }
    return selectedUnit ? pathTo(selectedUnit, target, reach) : [];
  }

  function onTileRightClick(tile: Tile, event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const unitHere = unitAt(units, tile);
    if (!unitHere) {
      setUnitTooltip(null);
      return;
    }

    const board = event.currentTarget.parentElement?.getBoundingClientRect();
    const mouseX = board ? event.clientX - board.left : tile.x * TILE + TILE + 8;
    const mouseY = board ? event.clientY - board.top : tile.y * TILE + 8;
    const left = Math.min(mouseX + 8, W * TILE - 190);
    const top = Math.min(mouseY + 8, H * TILE - 95);

    setActionMenu(null);
    setCombatPreview(null);
    setUnitTooltip({ x: left, y: top, unitId: unitHere.id });
    setMessage(`${sideLabel(unitHere.side)} ${unitDefs[unitHere.type].name}.`);
  }

  function onTileClick(tile: Tile, event?: React.MouseEvent<HTMLButtonElement>) {
    if (turn !== "player" || winner) return;
    const clickedUnit = unitAt(units, tile);
    setUnitTooltip(null);
    setCombatPreview(null);
    setActionMenu(null);

    if (clickedUnit?.side === "player") {
      setSelectedProductionTile(null);
      setSelectedUnitId(clickedUnit.id);
      setDrawnPath([{ x: clickedUnit.x, y: clickedUnit.y }]);

      const standingTile = tiles.get(key(clickedUnit.x, clickedUnit.y));
      const canCaptureHere =
        !clickedUnit.acted &&
        canCapture(clickedUnit) &&
        !!standingTile &&
        isCapturableTerrain(standingTile.type) &&
        standingTile.owner !== clickedUnit.side;

      if (canCaptureHere) {
        openActionMenu(standingTile!, undefined, standingTile!, event);
        setMessage(`${unitDefs[clickedUnit.type].name} can capture this ${terrainDefs[standingTile!.type].name}.`);
      } else {
        setMessage(`${unitDefs[clickedUnit.type].name} selected. Choose a tile, then confirm Move or Attack.`);
      }
      return;
    }

    if (!selectedUnit || selectedUnit.acted) {
      if (isProductionTerrain(tile.type) && tile.owner === "player" && !clickedUnit) {
        setSelectedUnitId(null);
        setActionMenu(null);
        setCombatPreview(null);
        setSelectedProductionTile(tile);
        setMessage(tile.type === "airport" ? "Choose a Copter from the airport dropdown." : "Choose a ground unit from the factory dropdown.");
        return;
      }

      setSelectedUnitId(null);
      setActionMenu(null);
      setSelectedProductionTile(null);
      return;
    }

    setSelectedProductionTile(null);

    const enemy = clickedUnit?.side === "ai" ? clickedUnit : undefined;
    if (enemy && attackableEnemyIds.has(enemy.id)) {
      const moveTarget = getAdjacentMoveTarget(selectedUnit, enemy);
      openActionMenu(tile, enemy, moveTarget ?? undefined, event);
      setMessage("Choose Attack, or Move if you only want to move next to the enemy.");
      return;
    }

    if (!reach.has(key(tile.x, tile.y))) {
      cancelSelection();
      return;
    }

    const enemyFromThisTile = units.find(enemy =>
      enemy.side === "ai" && dist(tile, enemy) <= unitDefs[selectedUnit.type].range
    );

    if (enemyFromThisTile) {
      openActionMenu(tile, enemyFromThisTile, tile, event);
      setMessage("Choose Attack from this position, or Move only.");
      return;
    }

    openActionMenu(tile, undefined, undefined, event);
    setMessage("Confirm movement.");
  }

  function cancelCombatPreview() {
    if (combatPreview?.returnTo) {
      setUnits(prev => prev.map(u => u.id === combatPreview.attacker.id ? { ...u, x: combatPreview.returnTo!.x, y: combatPreview.returnTo!.y, moved: false, acted: false } : u));
      setSelectedUnitId(combatPreview.attacker.id);
      setMessage(`${unitDefs[combatPreview.attacker.type].name} returned to its previous position.`);
    }
    setCombatPreview(null);
  }

  function confirmAttack() {
    if (!combatPreview) return;
    const { attacker, defender, atk, counter } = combatPreview;
    setUnits(prev => {
      let next = prev.map(u => u.id === defender.id ? { ...u, hp: u.hp - Math.ceil(atk / MAX_HP) } : u).filter(u => u.hp > 0);
      const defenderAlive = next.some(u => u.id === defender.id);
      if (defenderAlive && counter > 0) next = next.map(u => u.id === attacker.id ? { ...u, hp: u.hp - Math.ceil(counter / MAX_HP), acted: true, moved: false } : u).filter(u => u.hp > 0);
      else next = next.map(u => u.id === attacker.id ? { ...u, acted: true, moved: false } : u);
      return next;
    });
    setMessage(`${unitDefs[attacker.type].name} dealt ${atk}% damage${counter ? ` and received ${counter}% counter damage` : ""}.`);
    setSelectedUnitId(null);
    setCombatPreview(null);
  }

  function build(type: UnitType) {
    if (!selectedProductionTile) return;
    const buildingName = terrainDefs[selectedProductionTile.type].name;
    if (!canProduceUnit(selectedProductionTile, type)) { setMessage(`${buildingName} cannot build ${unitDefs[type].name}.`); return; }
    if (unitAt(units, selectedProductionTile)) { setMessage(`${buildingName} is blocked by a unit.`); return; }
    const cost = unitDefs[type].cost;
    if (funds.player < cost) { setMessage("Not enough funds."); return; }
    setFunds(f => ({ ...f, player: f.player - cost }));
    setUnits(prev => [...prev, { id: Date.now(), side: "player", commander: playerCommander, type, x: selectedProductionTile.x, y: selectedProductionTile.y, hp: 10, acted: true }]);
    setSelectedProductionTile(null);
    setMessage(`Built ${unitDefs[type].name}. You can build from another empty ${buildingName.toLowerCase()} or end your turn.`);
  }

  // AI turn is handled in game/ai/runAiTurn.ts so this component only starts the transition.
  function endTurn() {
    setSelectedUnitId(null);
    setSelectedProductionTile(null);
    setCombatPreview(null);
    setActionMenu(null);
    setUnitTooltip(null);
    setDrawnPath([]);
    setTurn("ai");
    setMessage("Red AI is thinking...");

    window.setTimeout(() => {
      void runAiTurn({
        units,
        tiles,
        funds,
        day,
        aiCommander,
        setTiles,
        setUnits,
        setFunds,
        setDay,
        setTurnSnapshot,
        setTurn,
        setMovingUnitId,
        setMessage,
      });
    }, 300);
  }

  function restartTurn() {
    if (turn !== "player") return;
    setTiles(new Map(turnSnapshot.tiles));
    setUnits(turnSnapshot.units.map(u => ({ ...u })));
    setFunds({ ...turnSnapshot.funds });
    setDay(turnSnapshot.day);
    setSelectedUnitId(null);
    setSelectedProductionTile(null);
    setCombatPreview(null);
    setActionMenu(null);
    setUnitTooltip(null);
    setDrawnPath([]);
    setMovingUnitId(null);
    setConfirmDialog(null);
    setMessage("Turn restarted.");
  }

  function restartGame() {
    if (turn !== "player") return;
    const fresh = createFreshGameState();
    setTiles(fresh.tiles);
    setUnits(fresh.units);
    setTurn(fresh.turn);
    setDay(fresh.day);
    setFunds(fresh.funds);
    setSelectedUnitId(null);
    setSelectedProductionTile(null);
    setUnitTooltip(null);
    setCombatPreview(null);
    setActionMenu(null);
    setMovingUnitId(null);
    setConfirmDialog(null);
    setTurnSnapshot({ tiles: fresh.tiles, units: fresh.units, funds: fresh.funds, day: fresh.day });
    setMessage("Game restarted. Choose Single Player to begin again.");
    setScreen("home");
  }

  // Screen routing.
  if (screen === "home") return <HomeScreen onStart={() => setScreen("select")} />;
  if (screen === "select") return <CharacterSelect onPick={chooseCommander} />;

  return (
    <GameScreen
      playerCommander={playerCommander}
      aiCommander={aiCommander}
      funds={funds}
      day={day}
      turn={turn}
      winner={winner}
      message={message}
      tiles={tiles}
      units={units}
      selectedUnitId={selectedUnitId}
      selectedUnit={selectedUnit}
      reach={reach}
      attackableEnemyIds={attackableEnemyIds}
      hoverTile={hoverTile}
      arrowPath={arrowPath}
      movingUnitId={movingUnitId}
      unitTooltip={unitTooltip}
      tooltipUnit={tooltipUnit}
      actionMenu={actionMenu}
      selectedProductionTile={selectedProductionTile}
      combatPreview={combatPreview}
      confirmDialog={confirmDialog}
      commanderFor={commanderFor}
      onContextMenu={(event) => {
        event.preventDefault();
        setUnitTooltip(null);
        cancelSelection();
      }}
      onEndTurn={endTurn}
      onOpenRestartTurnDialog={() => setConfirmDialog("turn")}
      onOpenRestartGameDialog={() => setConfirmDialog("game")}
      onTileClick={onTileClick}
      onTileRightClick={onTileRightClick}
      onTileHover={handleTileHover}
      onPreviewAttack={previewAttack}
      onMoveUnit={moveSelectedUnit}
      onCancelSelection={cancelSelection}
      onBuild={build}
      onCloseActionMenu={() => setActionMenu(null)}
      onConfirmAttack={confirmAttack}
      onCancelCombatPreview={cancelCombatPreview}
      onRestartTurn={restartTurn}
      onRestartGame={restartGame}
      onCloseConfirmDialog={() => setConfirmDialog(null)}
    />
  );
}

