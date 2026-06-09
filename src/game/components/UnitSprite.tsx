"use client";

import { motion } from "framer-motion";
import type { CommanderId, Side, Unit } from "../types";
import { CAPTURE_POINTS, TILE } from "../constants";
import { UnitArt } from "./UnitArt";
import { HpNumber } from "./HpNumber";

export function UnitSprite({
  unit,
  selected,
  commander,
  turn,
  moving = false,
  captureLeft,
}: {
  unit: Unit;
  selected: boolean;
  commander: CommanderId;
  turn: Side;
  moving?: boolean;
  captureLeft?: number;
}) {
  const isExhausted = unit.acted && unit.side === turn;
  const captureProgress = CAPTURE_POINTS - (captureLeft ?? CAPTURE_POINTS);

  return (
    <motion.div
      layout={false}
      initial={false}
      animate={{ x: unit.x * TILE, y: unit.y * TILE }}
      transition={{ type: "tween", duration: 0.22, ease: "easeInOut" }}
      className={`pointer-events-none absolute left-0 top-0 z-30 flex items-center justify-center text-center ${selected ? "ring-4 ring-white" : ""}`}
      style={{ width: TILE, height: TILE }}
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <div className={`unit-pop flex h-[58px] w-[58px] items-center justify-center ${isExhausted ? "unit-exhausted" : ""}`}>
          <UnitArt type={unit.type} commander={commander} moving={moving} />
        </div>

        <div className="pointer-events-none absolute bottom-0 right-0 z-40 translate-x-[5px] translate-y-[5px]">
          <HpNumber value={unit.hp} />
        </div>

        {unit.capturing ? (
          <div
            title={`Capturing: ${captureProgress}/${CAPTURE_POINTS} complete`}
            className="absolute -right-1 top-6 z-40 flex items-center gap-1 rounded-full bg-yellow-300 px-1.5 py-[2px] text-[10px] font-black text-slate-950 shadow-lg"
          >
            <span>🚩</span>
            <span>{captureProgress}/{CAPTURE_POINTS}</span>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
