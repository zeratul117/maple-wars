import { AnimatePresence, motion } from "framer-motion";
import type { CombatPreview, CommanderId, Side } from "../types";
import { unitDefs } from "../data/units";
import { UnitArt } from "./UnitArt";

type CombatPreviewModalProps = {
  preview: CombatPreview | null;
  commanderFor: (side: Side) => CommanderId;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CombatPreviewModal({ preview, commanderFor, onConfirm, onCancel }: CombatPreviewModalProps) {
  return (
    <AnimatePresence>
      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: .95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: .95 }}
          className="fixed left-1/2 top-1/2 z-[999] w-[520px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-white bg-slate-950 p-5 shadow-2xl"
        >
          <div className="text-center text-xl font-black">Combat Preview</div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div className="rounded-2xl bg-blue-900/70 p-3">
              <div className="mx-auto flex h-16 items-center justify-center">
                <UnitArt type={preview.attacker.type} commander={commanderFor(preview.attacker.side)} moving />
              </div>
              <div className="font-black">{unitDefs[preview.attacker.type].name}</div>
              <div className="mt-1 rounded bg-white px-2 py-1 font-black text-slate-950">Deals {preview.atk}%</div>
            </div>

            <div className="rounded-2xl bg-red-900/70 p-3">
              <div className="mx-auto flex h-16 items-center justify-center">
                <UnitArt type={preview.defender.type} commander={commanderFor(preview.defender.side)} />
              </div>
              <div className="font-black">{unitDefs[preview.defender.type].name}</div>
              <div className="mt-1 rounded bg-white px-2 py-1 font-black text-slate-950">Counters {preview.counter}%</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={onConfirm} className="rounded-xl bg-red-600 px-4 py-3 font-black">Attack</button>
            <button onClick={onCancel} className="rounded-xl bg-slate-700 px-4 py-3 font-black">Cancel</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
