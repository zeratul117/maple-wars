import type { CommanderId, Funds, Side } from "../types";
import { commanders } from "../data/commanders";

type GameHeaderProps = {
  playerCommander: CommanderId;
  aiCommander: CommanderId;
  funds: Funds;
  day: number;
  turn: Side;
  winner: string | null;
  onEndTurn: () => void;
  onRestartTurn: () => void;
  onRestartGame: () => void;
};

export function GameHeader({
  playerCommander,
  aiCommander,
  funds,
  day,
  turn,
  winner,
  onEndTurn,
  onRestartTurn,
  onRestartGame,
}: GameHeaderProps) {
  return (
    <header className="fixed left-1/2 top-4 z-[9999] flex w-[calc(100vw-40px)] max-w-[960px] -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Maple Wars</h1>
        <p className="text-sm text-slate-300">{commanders[playerCommander].name} vs {commanders[aiCommander].name}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm font-black">
        <span className="rounded-xl bg-blue-600 px-3 py-2 shadow">Blue {funds.player}G</span>
        <span className="rounded-xl bg-red-600 px-3 py-2 shadow">Red {funds.ai}G</span>
        <span className="rounded-xl bg-yellow-300 px-3 py-2 text-slate-950 shadow">Day {day}</span>
        <button onClick={onEndTurn} disabled={turn !== "player" || !!winner} className="rounded-xl bg-white px-3 py-2 font-black text-slate-950 shadow disabled:opacity-40">End Turn</button>
        <button onClick={onRestartTurn} disabled={turn !== "player" || !!winner} className="rounded-xl bg-slate-700 px-3 py-2 font-black shadow disabled:opacity-40">Restart Turn</button>
        <button onClick={onRestartGame} disabled={turn !== "player"} className="rounded-xl bg-slate-700 px-3 py-2 font-black shadow disabled:opacity-40">Restart Game</button>
      </div>
    </header>
  );
}
