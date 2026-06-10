import { AnimatePresence, motion } from "framer-motion";
import type { CommanderId, Funds, Tile, Unit, UnitType } from "../types";
import { H, TILE, W } from "../constants";
import { terrainDefs } from "../data/terrain";
import { unitDefs } from "../data/units";
import { buildOptionsForTile } from "../rules/production";
import { unitAt } from "../rules/common";
import { UnitArt } from "./UnitArt";

type ProductionMenuProps = {
  tile: Tile | null;
  funds: Funds;
  units: Unit[];
  playerCommander: CommanderId;
  onBuild: (type: UnitType) => void;
  onClose: () => void;
};

export function ProductionMenu({
  tile,
  funds,
  units,
  playerCommander,
  onBuild,
  onClose,
}: ProductionMenuProps) {
  return (
    <AnimatePresence>
      {tile && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          className="absolute z-[80] flex max-h-[430px] w-[460px] flex-col rounded-3xl border-4 border-white bg-slate-950 p-4 shadow-2xl"
          style={{
            left: Math.min(tile.x * TILE, W * TILE - 480),
            top: Math.min(tile.y * TILE + TILE + 6, H * TILE - 440),
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-lg font-black">{terrainDefs[tile.type].name}</div>
            <button onClick={onClose} className="rounded bg-white/10 px-2 py-1 text-xs font-bold">Close</button>
          </div>

          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
            {buildOptionsForTile(tile).map(type => {
              const definition = unitDefs[type];
              const disabled = funds.player < definition.cost || !!unitAt(units, tile);

              return (
                <button
                  key={type}
                  disabled={disabled}
                  onClick={() => onBuild(type)}
                  className="flex min-h-[132px] flex-col items-center justify-between gap-2 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-3 text-center shadow hover:from-blue-800 hover:to-blue-700 disabled:opacity-40"
                >
                  <span className="flex h-16 w-20 items-center justify-center rounded-2xl bg-white/10">
                    <UnitArt type={type} commander={playerCommander} />
                  </span>
                  <span className="block font-black leading-tight">{definition.name}</span>
                  <span className="mt-auto rounded-lg bg-yellow-300 px-3 py-1 text-sm font-black text-slate-950 shadow">{definition.cost}G</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
