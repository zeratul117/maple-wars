import { AnimatePresence, motion } from "framer-motion";
import type { ActionMenu as ActionMenuState, Point, Tile, Unit } from "../types";
import { canCapture, isCapturableTerrain, key } from "../rules/common";

type ActionMenuProps = {
  actionMenu: ActionMenuState | null;
  selectedUnit: Unit | null;
  tiles: Map<string, Tile>;
  onPreviewAttack: (enemy: Unit, moveTarget?: Point) => void;
  onMove: (target: Point) => void;
  onCapture: (target: Point) => void;
  onClose: () => void;
};

export function ActionMenu({
  actionMenu,
  selectedUnit,
  tiles,
  onPreviewAttack,
  onMove,
  onCapture,
  onClose,
}: ActionMenuProps) {
  const target = actionMenu ? actionMenu.moveTarget ?? actionMenu.tile : null;
  const targetTile = target ? tiles.get(key(target.x, target.y)) : null;
  const canCaptureTarget =
    !!actionMenu &&
    !!selectedUnit &&
    !!target &&
    canCapture(selectedUnit) &&
    !!targetTile &&
    isCapturableTerrain(targetTile.type) &&
    targetTile.owner !== selectedUnit.side;

  return (
    <AnimatePresence>
      {actionMenu && selectedUnit && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          className="absolute z-[85] w-40 overflow-hidden rounded-2xl border-2 border-white bg-slate-950 shadow-2xl"
          style={{ left: actionMenu.x, top: actionMenu.y }}
        >
          {actionMenu.enemy && (
            <button onClick={() => onPreviewAttack(actionMenu.enemy!, actionMenu.moveTarget)} className="flex w-full items-center gap-2 bg-red-600 px-4 py-3 text-left font-black hover:bg-red-500">
              <span>🎯</span><span>Attack</span>
            </button>
          )}

          {(!actionMenu.enemy || actionMenu.moveTarget) && target && (
            <button onClick={() => onMove(target)} className="flex w-full items-center gap-2 bg-blue-600 px-4 py-3 text-left font-black hover:bg-blue-500">
              <span>👣</span><span>Move</span>
            </button>
          )}

          {canCaptureTarget && target ? (
            <button onClick={() => onCapture(target)} className="flex w-full items-center gap-2 bg-yellow-500 px-4 py-3 text-left font-black hover:bg-yellow-400">
              <span>🚩</span><span>Capture</span>
            </button>
          ) : null}

          <button onClick={onClose} className="flex w-full items-center gap-2 bg-slate-800 px-4 py-2 text-left text-sm font-bold hover:bg-slate-700">
            <span>✕</span><span>Cancel</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
