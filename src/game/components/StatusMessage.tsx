import type { Side } from "../types";

type StatusMessageProps = {
  winner: string | null;
  turn: Side;
  message: string;
};

export function StatusMessage({ winner, turn, message }: StatusMessageProps) {
  return (
    <div className="mb-3 rounded-2xl bg-slate-900/90 px-4 py-3 text-sm text-slate-200 shadow-inner">
      <b className="text-white">{winner ?? (turn === "player" ? "Blue turn" : "Red AI turn")}</b> · {message}
    </div>
  );
}
