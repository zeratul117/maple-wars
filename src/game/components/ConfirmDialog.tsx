import { AnimatePresence, motion } from "framer-motion";

type ConfirmDialogProps = {
  dialog: null | "turn" | "game";
  onRestartTurn: () => void;
  onRestartGame: () => void;
  onClose: () => void;
};

export function ConfirmDialog({ dialog, onRestartTurn, onRestartGame, onClose }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          initial={{ opacity: 0, scale: .92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: .92 }}
          className="absolute left-1/2 top-1/2 z-[95] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-white bg-slate-950 p-5 text-center shadow-2xl"
        >
          <div className="text-2xl font-black">Are you sure?</div>
          <p className="mt-2 text-sm text-slate-300">{dialog === "turn" ? "Restart this turn and restore your last snapshot." : "Restart the whole game and return to the title screen."}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={dialog === "turn" ? onRestartTurn : onRestartGame} className="rounded-xl bg-red-600 px-4 py-3 font-black">Yes</button>
            <button onClick={onClose} className="rounded-xl bg-slate-700 px-4 py-3 font-black">No</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
