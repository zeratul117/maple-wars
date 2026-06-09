"use client";

import { motion } from "framer-motion";
import type { CommanderId } from "../types";
import { COMMANDER_IDS, UNIT_TYPES } from "../constants";
import { commanders } from "../data/commanders";
import { unitDefs } from "../data/units";
import { CommanderPortrait } from "./CommanderPortrait";
import { UnitArt } from "./UnitArt";

export function CharacterSelect({ onPick }: { onPick: (id: CommanderId) => void }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#334b7c,#10172a_62%)] p-6 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black">Choose Your Commander</h1>
          <p className="mt-2 text-slate-300">The AI will randomly choose one of the remaining commanders.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {COMMANDER_IDS.map(id => {
            const commander = commanders[id];

            return (
              <motion.button
                key={id}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPick(id)}
                className="overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/70 text-left shadow-2xl"
              >
                <div className={`bg-gradient-to-br ${commander.theme} p-6 text-center`}>
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-white/30 shadow-inner">
                    <CommanderPortrait src={commander.portrait} name={commander.name} />
                  </div>
                </div>

                <div className="p-5">
                  <h2 className="text-2xl font-black">{commander.name}</h2>
                  <p className="font-bold text-yellow-200">{commander.title}</p>
                  <p className="mt-3 text-sm text-slate-300">{commander.description}</p>

                  <div className="mt-3 rounded-2xl border border-yellow-200/30 bg-yellow-300/10 p-3 text-sm text-yellow-100">
                    <span className="font-black">Passive:</span> {commander.passive}
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/10 p-3">
                    <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
                      Available Units
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {UNIT_TYPES.map(type => (
                        <div
                          key={type}
                          className="flex min-h-[92px] flex-col items-center justify-between rounded-2xl bg-slate-900/70 p-2 text-center ring-1 ring-white/10"
                        >
                          <span className="flex h-14 w-16 items-center justify-center rounded-xl bg-white/10">
                            <UnitArt type={type} commander={id} />
                          </span>
                          <span className="mt-1 text-[11px] font-black leading-tight text-slate-100">
                            {unitDefs[type].name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
