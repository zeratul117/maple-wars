"use client";

import { motion } from "framer-motion";

export function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#415f9f,#10172a_62%)] p-6 text-white">
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl rounded-[36px] border border-white/15 bg-slate-950/60 p-10 text-center shadow-2xl backdrop-blur"
      >
        <div className="mb-4 text-7xl">⚔️</div>
        <h1 className="text-6xl font-black tracking-tight">Maple Wars</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
          Basically, Advance Wars with MapleStory assets to make it cuter!
        </p>
        <button
          onClick={onStart}
          className="mt-8 rounded-2xl bg-yellow-300 px-10 py-4 text-xl font-black text-slate-950 shadow-xl transition hover:scale-105"
        >
          Single Player
        </button>
      </motion.section>
    </main>
  );
}
