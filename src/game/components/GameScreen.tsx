import type React from "react";
import type {
  ActionMenu,
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
import { GameBoard } from "./GameBoard";
import { GameHeader } from "./GameHeader";
import { GameStyles } from "./GameStyles";
import { StatusMessage } from "./StatusMessage";

type GameScreenProps = {
  playerCommander: CommanderId;
  aiCommander: CommanderId;
  funds: Funds;
  day: number;
  turn: Side;
  winner: string | null;
  message: string;
  tiles: Map<string, Tile>;
  units: Unit[];
  selectedUnitId: number | null;
  selectedUnit: Unit | null;
  reach: Map<string, number>;
  attackableEnemyIds: Set<number>;
  hoverTile: Tile | null;
  arrowPath: Point[];
  movingUnitId: number | null;
  unitTooltip: UnitTooltip | null;
  tooltipUnit: Unit | null;
  actionMenu: ActionMenu | null;
  selectedProductionTile: Tile | null;
  combatPreview: CombatPreview | null;
  confirmDialog: null | "turn" | "game";
  commanderFor: (side: Side) => CommanderId;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onEndTurn: () => void;
  onOpenRestartTurnDialog: () => void;
  onOpenRestartGameDialog: () => void;
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

export function GameScreen({
  playerCommander,
  aiCommander,
  funds,
  day,
  turn,
  winner,
  message,
  tiles,
  units,
  selectedUnitId,
  selectedUnit,
  reach,
  attackableEnemyIds,
  hoverTile,
  arrowPath,
  movingUnitId,
  unitTooltip,
  tooltipUnit,
  actionMenu,
  selectedProductionTile,
  combatPreview,
  confirmDialog,
  commanderFor,
  onContextMenu,
  onEndTurn,
  onOpenRestartTurnDialog,
  onOpenRestartGameDialog,
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
}: GameScreenProps) {
  return (
    <main className="min-h-screen overflow-auto bg-[radial-gradient(circle_at_top,#334b7c,#10172a_58%)] p-5 text-white" onContextMenu={onContextMenu}>
      <GameStyles />

      <section className="mx-auto w-fit rounded-[28px] border border-white/10 bg-slate-950/55 p-4 pt-28 shadow-2xl">
        <GameHeader
          playerCommander={playerCommander}
          aiCommander={aiCommander}
          funds={funds}
          day={day}
          turn={turn}
          winner={winner}
          onEndTurn={onEndTurn}
          onRestartTurn={onOpenRestartTurnDialog}
          onRestartGame={onOpenRestartGameDialog}
        />

        <StatusMessage winner={winner} turn={turn} message={message} />

        <GameBoard
          tiles={tiles}
          units={units}
          selectedUnitId={selectedUnitId}
          selectedUnit={selectedUnit}
          reach={reach}
          attackableEnemyIds={attackableEnemyIds}
          hoverTile={hoverTile}
          arrowPath={arrowPath}
          movingUnitId={movingUnitId}
          turn={turn}
          playerCommander={playerCommander}
          funds={funds}
          unitTooltip={unitTooltip}
          tooltipUnit={tooltipUnit}
          actionMenu={actionMenu}
          selectedProductionTile={selectedProductionTile}
          combatPreview={combatPreview}
          confirmDialog={confirmDialog}
          commanderFor={commanderFor}
          onTileClick={onTileClick}
          onTileRightClick={onTileRightClick}
          onTileHover={onTileHover}
          onPreviewAttack={onPreviewAttack}
          onMoveUnit={onMoveUnit}
          onCancelSelection={onCancelSelection}
          onBuild={onBuild}
          onCloseActionMenu={onCloseActionMenu}
          onConfirmAttack={onConfirmAttack}
          onCancelCombatPreview={onCancelCombatPreview}
          onRestartTurn={onRestartTurn}
          onRestartGame={onRestartGame}
          onCloseConfirmDialog={onCloseConfirmDialog}
        />
      </section>
    </main>
  );
}
