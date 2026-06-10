import type React from "react";
import type {
  ActionMenu as ActionMenuState,
  CommanderId,
  CombatPreview,
  Funds,
  Point,
  Side,
  Tile,
  Unit,
  UnitTooltip,
  UnitType,
} from "../types";
import { H, TILE, W } from "../constants";
import { terrainDefs } from "../data/terrain";
import { canEndMovementOn } from "../rules/movement";
import { key, unitAt } from "../rules/common";
import { ActionMenu } from "./ActionMenu";
import { ArrowOverlay } from "./ArrowOverlay";
import { CombatPreviewModal } from "./CombatPreviewModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { ProductionMenu } from "./ProductionMenu";
import { TileArt } from "./TileArt";
import { UnitSprite } from "./UnitSprite";
import { UnitTooltipCard } from "./UnitTooltipCard";

type GameBoardProps = {
  tiles: Map<string, Tile>;
  units: Unit[];
  selectedUnitId: number | null;
  selectedUnit: Unit | null;
  reach: Map<string, number>;
  attackableEnemyIds: Set<number>;
  hoverTile: Tile | null;
  arrowPath: Point[];
  movingUnitId: number | null;
  turn: Side;
  playerCommander: CommanderId;
  funds: Funds;
  unitTooltip: UnitTooltip | null;
  tooltipUnit: Unit | null;
  actionMenu: ActionMenuState | null;
  selectedProductionTile: Tile | null;
  combatPreview: CombatPreview | null;
  confirmDialog: null | "turn" | "game";
  commanderFor: (side: Side) => CommanderId;
  onTileClick: (tile: Tile, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onTileRightClick: (tile: Tile, event: React.MouseEvent<HTMLButtonElement>) => void;
  onTileHover: (tile: Tile) => void;
  onPreviewAttack: (enemy: Unit, moveTarget?: Point) => void;
  onMoveUnit: (target: Point, doCapture?: boolean) => void;
  onCancelSelection: () => void;
  onBuild: (type: UnitType) => void;
  onCloseActionMenu: () => void;
  onConfirmAttack: () => void;
  onCancelCombatPreview: () => void;
  onRestartTurn: () => void;
  onRestartGame: () => void;
  onCloseConfirmDialog: () => void;
};

export function GameBoard({
  tiles,
  units,
  selectedUnitId,
  selectedUnit,
  reach,
  attackableEnemyIds,
  hoverTile,
  arrowPath,
  movingUnitId,
  turn,
  playerCommander,
  funds,
  unitTooltip,
  tooltipUnit,
  actionMenu,
  selectedProductionTile,
  combatPreview,
  confirmDialog,
  commanderFor,
  onTileClick,
  onTileRightClick,
  onTileHover,
  onPreviewAttack,
  onMoveUnit,
  onCancelSelection,
  onBuild,
  onCloseActionMenu,
  onConfirmAttack,
  onCancelCombatPreview,
  onRestartTurn,
  onRestartGame,
  onCloseConfirmDialog,
}: GameBoardProps) {
  return (
    <div className="relative rounded-2xl border-4 border-slate-900 bg-black p-2 shadow-2xl" style={{ width: W * TILE + 24 }}>
      <div className="relative grid overflow-hidden rounded-xl" style={{ gridTemplateColumns: `repeat(${W}, ${TILE}px)`, width: W * TILE, height: H * TILE }}>
        {[...tiles.values()].map(tile => {
          const unitHere = unitAt(units, tile);
          const isReachable = selectedUnit && !selectedUnit.acted && !selectedUnit.moved && reach.has(key(tile.x, tile.y)) && canEndMovementOn(selectedUnit, tile, units);
          const ownerClass = tile.owner === "player" ? "owned-player" : tile.owner === "ai" ? "owned-ai" : "";
          const enemyTarget = selectedUnit && unitHere?.side === "ai" && attackableEnemyIds.has(unitHere.id);
          const hoveredTarget = enemyTarget && hoverTile?.x === tile.x && hoverTile?.y === tile.y;

          return (
            <button
              key={key(tile.x, tile.y)}
              onClick={(event) => onTileClick(tile, event)}
              onContextMenu={(event) => onTileRightClick(tile, event)}
              onMouseEnter={() => onTileHover(tile)}
              className={`tile relative ${tile.type} ${ownerClass} border border-black/10 ${isReachable ? "brightness-125" : ""}`}
              title={`${terrainDefs[tile.type].name}: ${terrainDefs[tile.type].defense}★ defense`}
            >
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

        <UnitTooltipCard tooltip={unitTooltip} unit={tooltipUnit} />

        <ActionMenu
          actionMenu={actionMenu}
          selectedUnit={selectedUnit}
          tiles={tiles}
          onPreviewAttack={onPreviewAttack}
          onMove={(target) => onMoveUnit(target)}
          onCapture={(target) => onMoveUnit(target, true)}
          onClose={onCloseActionMenu}
        />

        <ProductionMenu
          tile={selectedProductionTile}
          funds={funds}
          units={units}
          playerCommander={playerCommander}
          onBuild={onBuild}
          onClose={onCancelSelection}
        />

        <ConfirmDialog
          dialog={confirmDialog}
          onRestartTurn={onRestartTurn}
          onRestartGame={onRestartGame}
          onClose={onCloseConfirmDialog}
        />

        <CombatPreviewModal
          preview={combatPreview}
          commanderFor={commanderFor}
          onConfirm={onConfirmAttack}
          onCancel={onCancelCombatPreview}
        />
      </div>
    </div>
  );
}
