import { AnimatePresence, motion } from "framer-motion";
import type { Unit, UnitTooltip } from "../types";
import { MAX_HP } from "../constants";
import { unitDefs } from "../data/units";
import { effectiveMove } from "../rules/movement";
import { sideLabel } from "../rules/common";

type UnitTooltipCardProps = {
  tooltip: UnitTooltip | null;
  unit: Unit | null;
};

export function UnitTooltipCard({ tooltip, unit }: UnitTooltipCardProps) {
  return (
    <AnimatePresence>
      {tooltip && unit && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.95 }}
          className="absolute z-[95] w-44 rounded-2xl border-2 border-white bg-slate-950 px-3 py-2 text-left shadow-2xl"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{sideLabel(unit.side)} Unit</div>
          <div className="text-base font-black text-white">{unitDefs[unit.type].name}</div>
          <div className="mt-1 text-xs leading-snug text-slate-300">{unitDefs[unit.type].role}</div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs font-bold text-slate-100">
            <div className="rounded-lg bg-white/10 px-2 py-1">HP: {unit.hp}/{MAX_HP}</div>
            <div className="rounded-lg bg-white/10 px-2 py-1">Move: {effectiveMove(unit)}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
