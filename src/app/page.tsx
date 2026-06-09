"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
import { ArrowOverlay } from "../game/components/ArrowOverlay";
import { CharacterSelect } from "../game/components/CharacterSelect";
import { HomeScreen } from "../game/components/HomeScreen";
import { TileArt } from "../game/components/TileArt";
import { UnitArt } from "../game/components/UnitArt";
import { UnitSprite } from "../game/components/UnitSprite";
import { canCapture, dist, isCapturableTerrain, isProductionTerrain, key, sideLabel, unitAt } from "../game/rules/common";
import { buildOptionsForTile, canProduceUnit } from "../game/rules/production";
import { canEndMovementOn, effectiveMove, pathMoveCost, pathTo, reachable } from "../game/rules/movement";
import { damagePercent } from "../game/rules/combat";
import { createFreshGameState, propertyIncome, startingFunds } from "../game/rules/economy";
import { repairSummary, repairUnitsForTurn } from "../game/rules/repair";
import { resolveCapture } from "../game/rules/capture";


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
  const winner = !aiHQ ? "Blue wins!" : !playerHQ ? "Red wins!" : null;

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

  // AI turn: repair, build, capture, attack, then hand control back to the player.
  function endTurn() {
    setSelectedUnitId(null);
    setSelectedProductionTile(null);
    setCombatPreview(null);
    setActionMenu(null);
    setUnitTooltip(null);
    setDrawnPath([]);
    setTurn("ai");
    setMessage("Red AI is thinking...");

    const runAI = async () => {
      let simUnits = units.map(u => u.side === "ai" ? { ...u, acted: false, moved: false } : { ...u });
      let simTiles = new Map(tiles);
      let simFunds = { ...funds, ai: funds.ai + propertyIncome(tiles, "ai") };
      const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

      const sync = async (msg: string, ms = 350) => {
        setTiles(new Map(simTiles));
        setUnits(simUnits.map(u => ({ ...u })));
        setMessage(msg);
        await wait(ms);
      };

      const aiRepairs = repairUnitsForTurn(simUnits, simTiles, simFunds.ai, "ai");
      simUnits = aiRepairs.units;
      simFunds.ai = aiRepairs.funds;
      if (aiRepairs.totalHealed > 0) {
        await sync(repairSummary("ai", aiRepairs.totalHealed, aiRepairs.totalCost), 450);
      }

      const aiCanCapture = (unit: Unit, point: Point) => {
        const tile = simTiles.get(key(point.x, point.y));
        return !!tile && canCapture(unit) && isCapturableTerrain(tile.type) && tile.owner !== "ai";
      };

      const propertyValue = (tile: Tile) => {
        if (tile.type === "hq") return 1000;
        if (tile.type === "airport") return tile.owner === "player" ? 820 : 650;
        if (tile.type === "factory") return tile.owner === "player" ? 750 : 600;
        if (tile.type === "city") return tile.owner === "player" ? 520 : 420;
        return 0;
      };

      const findBestProperty = (unit: Unit) => {
        return [...simTiles.values()]
          .filter(t => isCapturableTerrain(t.type) && t.owner !== "ai")
          .sort((a, b) => (dist(unit, a) - propertyValue(a) / 100) - (dist(unit, b) - propertyValue(b) / 100))[0] ?? null;
      };

      const projectedAttack = (attacker: Unit, defender: Unit) => {
        const atk = damagePercent(attacker, defender, simTiles);
        const defenderHpAfterHit = Math.max(0, defender.hp - Math.ceil(atk / MAX_HP));
        const damagedDefender = { ...defender, hp: defenderHpAfterHit };
        const canCounter = defenderHpAfterHit > 0 && dist(defender, attacker) <= unitDefs[defender.type].range;
        const counter = canCounter ? damagePercent(damagedDefender, attacker, simTiles) : 0;
        const attackerHpAfterCounter = Math.max(0, attacker.hp - Math.ceil(counter / MAX_HP));
        const kills = defenderHpAfterHit <= 0;
        const favorable = kills || (atk >= counter + 15) || (defender.hp <= attacker.hp && atk >= counter - 5);
        return { atk, counter, defenderHpAfterHit, attackerHpAfterCounter, kills, favorable };
      };

      const performAttack = async (attacker: Unit, defender: Unit) => {
        const result = projectedAttack(attacker, defender);
        await sync(`Red ${unitDefs[attacker.type].name} attacks for ${result.atk}%. You counter for ${result.counter}%.`, 500);
        simUnits = simUnits
          .map(u => u.id === defender.id ? { ...u, hp: result.defenderHpAfterHit } : u)
          .filter(u => u.hp > 0);
        if (result.counter > 0) {
          simUnits = simUnits
            .map(u => u.id === attacker.id ? { ...u, hp: result.attackerHpAfterCounter } : u)
            .filter(u => u.hp > 0);
        }
        simUnits = simUnits.map(u => u.id === attacker.id ? { ...u, acted: true, moved: false } : u);
        await sync("Combat resolved.", 450);
      };

      const moveAIUnit = async (unit: Unit, target: Point, msg: string) => {
        const aiReach = reachable(unit, simUnits, simTiles);
        const path = pathTo(unit, target, aiReach);
        if (path.length <= 1) return unit;
        setMovingUnitId(unit.id);
        setMessage(msg);
        for (const step of path.slice(1)) {
          await wait(150);
          simUnits = simUnits.map(u => u.id === unit.id ? { ...u, x: step.x, y: step.y } : u);
          setUnits(simUnits.map(u => ({ ...u })));
        }
        setMovingUnitId(null);
        const moved = simUnits.find(u => u.id === unit.id)!;
        await sync(`Red ${unitDefs[moved.type].name} moved.`, 250);
        return moved;
      };

      const bestMoveToward = (unit: Unit, target: Point) => {
        const aiReach = reachable(unit, simUnits, simTiles);
        const moves = [...aiReach.keys()]
          .map(s => { const [x, y] = s.split(",").map(Number); return { x, y }; })
          .filter(p => canEndMovementOn(unit, p, simUnits));
        return moves
          .sort((a, b) => dist(a, target) - dist(b, target))[0] ?? unit;
      };

      const bestRetreatMove = (unit: Unit) => {
        const enemies = simUnits.filter(u => u.side === "player");
        const aiReach = reachable(unit, simUnits, simTiles);
        const moves = [...aiReach.keys()]
          .map(s => { const [x, y] = s.split(",").map(Number); return { x, y }; })
          .filter(p => canEndMovementOn(unit, p, simUnits));
        return moves.sort((a, b) => {
          const scoreA = enemies.reduce((sum, e) => sum + dist(a, e), 0);
          const scoreB = enemies.reduce((sum, e) => sum + dist(b, e), 0);
          return scoreB - scoreA;
        })[0] ?? unit;
      };

      // Build with purpose: factories make ground units, airports make Copters.
      const openProductionBuildings = [...simTiles.values()].filter(t =>
        isProductionTerrain(t.type) &&
        t.owner === "ai" &&
        !unitAt(simUnits, t)
      );

      const aiUnits = () => simUnits.filter(u => u.side === "ai");
      const countType = (type: UnitType) => aiUnits().filter(u => u.type === type).length;
      const countFoot = () => aiUnits().filter(u => canCapture(u)).length;
      const countCombat = () => aiUnits().filter(u => !canCapture(u)).length;
      const enemyCombatCount = simUnits.filter(u => u.side === "player" && !canCapture(u)).length;
      const capturableCount = [...simTiles.values()].filter(t => isCapturableTerrain(t.type) && t.owner !== "ai").length;

      const chooseBuild = (building: Tile): UnitType | null => {
        const totalAI = aiUnits().length;
        const foot = countFoot();
        const combat = countCombat();
        const enoughFootForNow = foot >= Math.min(4, Math.ceil(capturableCount / 4) + 1);

        if (building.type === "airport") {
          const playerHasCopter = simUnits.some(u => u.side === "player" && u.type === "copter");
          const aiNeedsAir = playerHasCopter || countType("copter") < Math.max(1, Math.floor(countType("tank") / 2));
          return aiNeedsAir && simFunds.ai >= unitDefs.copter.cost ? "copter" : null;
        }

        const playerHasCopter = simUnits.some(u => u.side === "player" && u.type === "copter");
        const antiAirTarget = Math.max(1, Math.ceil(countType("tank") / 2));

        if (totalAI === 0 && simFunds.ai >= 1000) return "infantry";
        if (foot < 2 && simFunds.ai >= 1000) return "infantry";

        if (playerHasCopter && simFunds.ai >= unitDefs.antiAir.cost && countType("antiAir") < antiAirTarget) return "antiAir";

        // If the player has combat units, AI should answer with ground combat units from factories.
        if (enemyCombatCount > combat && simFunds.ai >= 7000) return "tank";

        // Avoid endless infantry spam: once enough capturing units exist, build fighting units.
        if (enoughFootForNow) {
          if (playerHasCopter && simFunds.ai >= unitDefs.antiAir.cost && countType("antiAir") < antiAirTarget + 1) return "antiAir";
          if (simFunds.ai >= 7000 && countType("tank") <= countType("recon") + 2) return "tank";
          if (simFunds.ai >= 4000 && countType("recon") < 2) return "recon";
          if (simFunds.ai >= 3000 && foot < combat + 2) return "mech";
          if (simFunds.ai >= 1000 && foot < 5) return "infantry";
          return null;
        }

        // Still needs capture pressure, but mix in mechs instead of only infantry.
        if (simFunds.ai >= 3000 && countType("mech") < countType("infantry")) return "mech";
        if (simFunds.ai >= 1000) return "infantry";
        return null;
      };

      for (const building of openProductionBuildings) {
        const buildType = chooseBuild(building);
        if (!buildType || simFunds.ai < unitDefs[buildType].cost || !canProduceUnit(building, buildType)) continue;
        simUnits.push({
          id: Date.now() + building.x * 100 + building.y,
          side: "ai",
          commander: aiCommander,
          type: buildType,
          x: building.x,
          y: building.y,
          hp: 10,
          acted: true,
        });
        simFunds.ai -= unitDefs[buildType].cost;
        await sync(`Red AI built ${unitDefs[buildType].name} from an ${terrainDefs[building.type].name}.`, 450);
      }

      for (const aiId of simUnits.filter(u => u.side === "ai" && !u.acted).map(u => u.id)) {
        let current = simUnits.find(u => u.id === aiId);
        if (!current) continue;

        // Continue or start capture when already standing on a property.
        if (aiCanCapture(current, current)) {
          const stillCapturing = captureIfPossible(current, simTiles);
          simUnits = simUnits.map(u => u.id === current!.id ? { ...u, acted: true, capturing: stillCapturing } : u);
          await sync(`Red ${unitDefs[current.type].name} captures property.`, 550);
          continue;
        }

        const enemies = simUnits.filter(u => u.side === "player");
        const attacksInRange = enemies
          .filter(e => dist(current!, e) <= unitDefs[current!.type].range)
          .map(e => ({ enemy: e, result: projectedAttack(current!, e) }))
          .sort((a, b) => Number(b.result.kills) - Number(a.result.kills) || (b.result.atk - b.result.counter) - (a.result.atk - a.result.counter));

        const goodAttack = attacksInRange.find(a => a.result.favorable);
        if (goodAttack) {
          await performAttack(current, goodAttack.enemy);
          continue;
        }

        // Infantry/mechs value economy: go toward best property and capture if reached.
        if (canCapture(current)) {
          const property = findBestProperty(current);
          if (property) {
            const moveTarget = bestMoveToward(current, property);
            current = await moveAIUnit(current, moveTarget, `Red ${unitDefs[current.type].name} moves toward a property.`);
            if (aiCanCapture(current, current)) {
              const stillCapturing = captureIfPossible(current, simTiles);
              simUnits = simUnits.map(u => u.id === current!.id ? { ...u, acted: true, capturing: stillCapturing } : u);
              await sync(`Red ${unitDefs[current.type].name} starts capturing.`, 550);
            } else {
              simUnits = simUnits.map(u => u.id === current!.id ? { ...u, acted: true } : u);
            }
            continue;
          }
        }

        // Non-infantry or no property target: look for favorable attack after moving.
        const possibleMoves = [...reachable(current, simUnits, simTiles).keys()]
          .map(s => { const [x, y] = s.split(",").map(Number); return { x, y }; })
          .filter(p => canEndMovementOn(current!, p, simUnits));
        let bestAttackMove: { point: Point; enemy: Unit; score: number } | null = null;
        for (const point of possibleMoves) {
          const virtualAttacker = { ...current, x: point.x, y: point.y };
          for (const enemy of enemies) {
            if (dist(virtualAttacker, enemy) > unitDefs[current.type].range) continue;
            const result = projectedAttack(virtualAttacker, enemy);
            const score = (result.kills ? 100 : 0) + result.atk - result.counter;
            if (result.favorable && (!bestAttackMove || score > bestAttackMove.score)) bestAttackMove = { point, enemy, score };
          }
        }

        if (bestAttackMove) {
          current = await moveAIUnit(current, bestAttackMove.point, `Red ${unitDefs[current.type].name} moves into attack position.`);
          await performAttack(current, bestAttackMove.enemy);
          continue;
        }

        // If current fights are bad, low HP units retreat; healthy units move toward nearest enemy.
        if (attacksInRange.length > 0 && current.hp <= 6) {
          const retreat = bestRetreatMove(current);
          current = await moveAIUnit(current, retreat, `Red ${unitDefs[current.type].name} avoids a bad fight.`);
          simUnits = simUnits.map(u => u.id === current!.id ? { ...u, acted: true } : u);
          continue;
        }

        const nearestEnemy = enemies.sort((a, b) => dist(current!, a) - dist(current!, b))[0];
        if (nearestEnemy) {
          const advance = bestMoveToward(current, nearestEnemy);
          current = await moveAIUnit(current, advance, `Red ${unitDefs[current.type].name} advances.`);
        }
        simUnits = simUnits.map(u => u.id === current!.id ? { ...u, acted: true } : u);
      }

      let playerTurnFunds = { player: funds.player + propertyIncome(simTiles, "player"), ai: simFunds.ai };
      const playerRepairs = repairUnitsForTurn(simUnits, simTiles, playerTurnFunds.player, "player");
      const playerTurnUnits = playerRepairs.units.map(u => u.side === "player" ? { ...u, acted: false, moved: false } : u);
      playerTurnFunds = { player: playerRepairs.funds, ai: simFunds.ai };
      const nextDay = day + 1;
      setUnits(playerTurnUnits);
      setTiles(simTiles);
      setFunds(playerTurnFunds);
      setDay(nextDay);
      setTurnSnapshot({ tiles: new Map(simTiles), units: playerTurnUnits.map(u => ({ ...u })), funds: { ...playerTurnFunds }, day: nextDay });
      setTurn("player");
      setMovingUnitId(null);
      const playerRepairMessage = repairSummary("player", playerRepairs.totalHealed, playerRepairs.totalCost);
      setMessage(playerRepairMessage ? `${playerRepairMessage} Your turn.` : "Your turn. Select a unit, build ground units from factories, or build Copters from captured airports.");
    };

    window.setTimeout(() => { void runAI(); }, 300);
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
    <main className="min-h-screen overflow-auto bg-[radial-gradient(circle_at_top,#334b7c,#10172a_58%)] p-5 text-white" onContextMenu={(e) => { e.preventDefault(); setUnitTooltip(null); cancelSelection(); }}>
      <style>{`
        body { margin: 0; }
        .tile { width: ${TILE}px; height: ${TILE}px; image-rendering: pixelated; }
        .plain { background: linear-gradient(45deg,#aee857 25%,#c8f36e 25% 50%,#b9eb5c 50% 75%,#d4fb77 75%); background-size: 14px 14px; }
        .forest { background: linear-gradient(45deg,#7fcf44,#b7ec5e); }
        .mountain { background: linear-gradient(45deg,#cbb64b,#f4df73); }
        .road { background: #9198a7; }
        .river { background: #567cff; }
        .bridge { background: #73dff8; }
        .city, .factory, .airport, .hq { background: linear-gradient(45deg,#b8ea5b,#d8ff78); }
        .airport { background: linear-gradient(45deg,#b2de63,#d9ff84); }
        .city.owned-player, .factory.owned-player, .airport.owned-player, .hq.owned-player {
          background: linear-gradient(45deg,#5aa7ff,#9fd3ff);
        }
        .city.owned-ai, .factory.owned-ai, .airport.owned-ai, .hq.owned-ai {
          background: linear-gradient(45deg,#ff6b6b,#ffb1a8);
        }
        .city.owned-player span, .factory.owned-player span, .airport.owned-player span, .hq.owned-player span,
        .city.owned-ai span, .factory.owned-ai span, .airport.owned-ai span, .hq.owned-ai span {
          filter: drop-shadow(0 2px 0 rgba(0,0,0,.35));
        }
        .target-reticle { position: relative; width: 42px; height: 42px; border: 5px solid #0f1235; border-radius: 999px; animation: reticlePulse 0.9s ease-in-out infinite; box-shadow: 0 0 18px rgba(255,255,255,.35); }
        .target-reticle::before, .target-reticle::after { content: ""; position: absolute; background: #16c1a1; border-radius: 999px; left: 50%; top: 50%; transform: translate(-50%, -50%); }
        .target-reticle::before { width: 6px; height: 26px; }
        .target-reticle::after { width: 26px; height: 6px; }
        @keyframes reticlePulse { 0% { transform: scale(0.9) rotate(0deg); opacity: 0.75; } 50% { transform: scale(1.05) rotate(6deg); opacity: 1; } 100% { transform: scale(0.9) rotate(0deg); opacity: 0.75; } }
        .unit-pop {
          filter: drop-shadow(0 0 7px rgba(255,255,255,.55)) drop-shadow(0 5px 0 rgba(0,0,0,.45));
        }
        .unit-exhausted {
          filter: grayscale(1) saturate(0) brightness(0.92) contrast(1.08) drop-shadow(0 4px 0 rgba(0,0,0,.45));
        }
        .hp-number {
          display: inline-block;
          font-size: 28px;
          font-weight: 1000;
          line-height: 1;
          letter-spacing: -2px;
          color: #ff8c1a;
          -webkit-text-stroke: 2px white;
          text-shadow:
            -2px -2px 0 #222,
             2px -2px 0 #222,
            -2px  2px 0 #222,
             2px  2px 0 #222,
             0px  3px 0 rgba(0,0,0,.55);
        }
      `}</style>

      <section className="mx-auto w-fit rounded-[28px] border border-white/10 bg-slate-950/55 p-4 pt-28 shadow-2xl">
        <header className="fixed left-1/2 top-4 z-[9999] flex w-[calc(100vw-40px)] max-w-[960px] -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Maple Wars</h1>
            <p className="text-sm text-slate-300">{commanders[playerCommander].name} vs {commanders[aiCommander].name}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-black">
            <span className="rounded-xl bg-blue-600 px-3 py-2 shadow">Blue {funds.player}G</span>
            <span className="rounded-xl bg-red-600 px-3 py-2 shadow">Red {funds.ai}G</span>
            <span className="rounded-xl bg-yellow-300 px-3 py-2 text-slate-950 shadow">Day {day}</span>
            <button onClick={endTurn} disabled={turn !== "player" || !!winner} className="rounded-xl bg-white px-3 py-2 font-black text-slate-950 shadow disabled:opacity-40">End Turn</button>
            <button onClick={() => setConfirmDialog("turn")} disabled={turn !== "player" || !!winner} className="rounded-xl bg-slate-700 px-3 py-2 font-black shadow disabled:opacity-40">Restart Turn</button>
            <button onClick={() => setConfirmDialog("game")} disabled={turn !== "player"} className="rounded-xl bg-slate-700 px-3 py-2 font-black shadow disabled:opacity-40">Restart Game</button>
          </div>
        </header>

        <div className="mb-3 rounded-2xl bg-slate-900/90 px-4 py-3 text-sm text-slate-200 shadow-inner">
          <b className="text-white">{winner ?? (turn === "player" ? "Blue turn" : "Red AI turn")}</b> · {message}
        </div>

        <div className="relative rounded-2xl border-4 border-slate-900 bg-black p-2 shadow-2xl" style={{ width: W * TILE + 24 }}>
          <div className="relative grid overflow-hidden rounded-xl" style={{ gridTemplateColumns: `repeat(${W}, ${TILE}px)`, width: W * TILE, height: H * TILE }}>
            {[...tiles.values()].map(tile => {
              const unitHere = unitAt(units, tile);
              const isReachable = selectedUnit && !selectedUnit.acted && !selectedUnit.moved && reach.has(key(tile.x, tile.y)) && canEndMovementOn(selectedUnit, tile, units);
              const ownerClass = tile.owner === "player" ? "owned-player" : tile.owner === "ai" ? "owned-ai" : "";
              const enemyTarget = selectedUnit && unitHere?.side === "ai" && attackableEnemyIds.has(unitHere.id);
              const hoveredTarget = enemyTarget && hoverTile?.x === tile.x && hoverTile?.y === tile.y;
              return (
                <button key={key(tile.x,tile.y)} onClick={(event) => onTileClick(tile, event)} onContextMenu={(event) => onTileRightClick(tile, event)} onMouseEnter={() => handleTileHover(tile)} className={`tile relative ${tile.type} ${ownerClass} border border-black/10 ${isReachable ? "brightness-125" : ""}`} title={`${terrainDefs[tile.type].name}: ${terrainDefs[tile.type].defense}★ defense`}>
                  <TileArt tile={tile} />
                  {isReachable && <span className="absolute inset-1 z-10 rounded-xl bg-yellow-200/35 ring-2 ring-yellow-100/40" />}
                  {enemyTarget && <span className="absolute inset-1 z-20 rounded-xl bg-red-500/35 ring-2 ring-red-200/60" />}
                  {hoveredTarget && <span className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"><span className="target-reticle" /></span>}
                </button>
              );
            })}

            {units.map(unitHere => (
              <UnitSprite
                key={unitHere.id}
                unit={unitHere}
                selected={selectedUnitId === unitHere.id}
                commander={commanderFor(unitHere.side)}
                turn={turn}
                moving={movingUnitId === unitHere.id || (selectedUnitId === unitHere.id && !unitHere.moved && !unitHere.acted)}
                captureLeft={tiles.get(key(unitHere.x, unitHere.y))?.capture}
              />
            ))}

            <ArrowOverlay path={arrowPath} />

            <AnimatePresence>
              {unitTooltip && tooltipUnit && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  className="absolute z-[95] w-44 rounded-2xl border-2 border-white bg-slate-950 px-3 py-2 text-left shadow-2xl"
                  style={{ left: unitTooltip.x, top: unitTooltip.y }}
                >
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{sideLabel(tooltipUnit.side)} Unit</div>
                  <div className="text-base font-black text-white">{unitDefs[tooltipUnit.type].name}</div>
                  <div className="mt-1 text-xs leading-snug text-slate-300">{unitDefs[tooltipUnit.type].role}</div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs font-bold text-slate-100">
                    <div className="rounded-lg bg-white/10 px-2 py-1">HP: {tooltipUnit.hp}/{MAX_HP}</div>
                    <div className="rounded-lg bg-white/10 px-2 py-1">Move: {effectiveMove(tooltipUnit)}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {actionMenu && selectedUnit && (
                <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }} className="absolute z-[85] w-40 overflow-hidden rounded-2xl border-2 border-white bg-slate-950 shadow-2xl" style={{ left: actionMenu.x, top: actionMenu.y }}>
                  {actionMenu.enemy && <button onClick={() => previewAttack(actionMenu.enemy!, actionMenu.moveTarget)} className="flex w-full items-center gap-2 bg-red-600 px-4 py-3 text-left font-black hover:bg-red-500"><span>🎯</span><span>Attack</span></button>}
                  {(!actionMenu.enemy || actionMenu.moveTarget) && <button onClick={() => moveSelectedUnit(actionMenu.moveTarget ?? actionMenu.tile)} className="flex w-full items-center gap-2 bg-blue-600 px-4 py-3 text-left font-black hover:bg-blue-500"><span>👣</span><span>Move</span></button>}
                  {selectedUnit && canCapture(selectedUnit) && (() => {
                    const targetTile = tiles.get(key((actionMenu.moveTarget ?? actionMenu.tile).x, (actionMenu.moveTarget ?? actionMenu.tile).y));
                    return targetTile && isCapturableTerrain(targetTile.type) && targetTile.owner !== selectedUnit.side;
                  })() ? (
                    <button
                      onClick={() => {
                        const target = actionMenu.moveTarget ?? actionMenu.tile;
                        moveSelectedUnit(target, true);
                      }}
                      className="flex w-full items-center gap-2 bg-yellow-500 px-4 py-3 text-left font-black hover:bg-yellow-400"
                    >
                      <span>🚩</span><span>Capture</span>
                    </button>
                  ) : null}
                  <button onClick={() => setActionMenu(null)} className="flex w-full items-center gap-2 bg-slate-800 px-4 py-2 text-left text-sm font-bold hover:bg-slate-700"><span>✕</span><span>Cancel</span></button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedProductionTile && (
                <motion.div initial={{ opacity: 0, y: -12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.95 }} className="absolute z-[80] flex max-h-[430px] w-[460px] flex-col rounded-3xl border-4 border-white bg-slate-950 p-4 shadow-2xl" style={{ left: Math.min(selectedProductionTile.x * TILE, W * TILE - 480), top: Math.min(selectedProductionTile.y * TILE + TILE + 6, H * TILE - 440) }}>
                  <div className="mb-2 flex items-center justify-between"><div className="text-lg font-black">{terrainDefs[selectedProductionTile.type].name}</div><button onClick={cancelSelection} className="rounded bg-white/10 px-2 py-1 text-xs font-bold">Close</button></div>
                  <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
                    {buildOptionsForTile(selectedProductionTile).map(type => {
                      const d = unitDefs[type];
                      const disabled = funds.player < d.cost || !!unitAt(units, selectedProductionTile);
                      return <button key={type} disabled={disabled} onClick={() => build(type)} className="flex min-h-[132px] flex-col items-center justify-between gap-2 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-3 text-center shadow hover:from-blue-800 hover:to-blue-700 disabled:opacity-40"><span className="flex h-16 w-20 items-center justify-center rounded-2xl bg-white/10"><UnitArt type={type} commander={playerCommander} /></span><span className="block font-black leading-tight">{d.name}</span><span className="mt-auto rounded-lg bg-yellow-300 px-3 py-1 text-sm font-black text-slate-950 shadow">{d.cost}G</span></button>;
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {confirmDialog && <motion.div initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .92 }} className="absolute left-1/2 top-1/2 z-[95] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-white bg-slate-950 p-5 text-center shadow-2xl"><div className="text-2xl font-black">Are you sure?</div><p className="mt-2 text-sm text-slate-300">{confirmDialog === "turn" ? "Restart this turn and restore your last snapshot." : "Restart the whole game and return to the title screen."}</p><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={confirmDialog === "turn" ? restartTurn : restartGame} className="rounded-xl bg-red-600 px-4 py-3 font-black">Yes</button><button onClick={() => setConfirmDialog(null)} className="rounded-xl bg-slate-700 px-4 py-3 font-black">No</button></div></motion.div>}
            </AnimatePresence>

            <AnimatePresence>
              {combatPreview && <motion.div initial={{ opacity: 0, y: 20, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .95 }} className="fixed left-1/2 top-1/2 z-[999] w-[520px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-white bg-slate-950 p-5 shadow-2xl"><div className="text-center text-xl font-black">Combat Preview</div><div className="mt-4 grid grid-cols-2 gap-4 text-center"><div className="rounded-2xl bg-blue-900/70 p-3"><div className="mx-auto flex h-16 items-center justify-center"><UnitArt type={combatPreview.attacker.type} commander={commanderFor(combatPreview.attacker.side)} moving /></div><div className="font-black">{unitDefs[combatPreview.attacker.type].name}</div><div className="mt-1 rounded bg-white px-2 py-1 font-black text-slate-950">Deals {combatPreview.atk}%</div></div><div className="rounded-2xl bg-red-900/70 p-3"><div className="mx-auto flex h-16 items-center justify-center"><UnitArt type={combatPreview.defender.type} commander={commanderFor(combatPreview.defender.side)} /></div><div className="font-black">{unitDefs[combatPreview.defender.type].name}</div><div className="mt-1 rounded bg-white px-2 py-1 font-black text-slate-950">Counters {combatPreview.counter}%</div></div></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={confirmAttack} className="rounded-xl bg-red-600 px-4 py-3 font-black">Attack</button><button onClick={cancelCombatPreview} className="rounded-xl bg-slate-700 px-4 py-3 font-black">Cancel</button></div></motion.div>}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </main>
  );
}

