"use client";

import { motion } from "framer-motion";
import type { Point } from "../types";
import { H, TILE, W } from "../constants";

function center(point: Point) {
  return {
    x: point.x * TILE + TILE / 2,
    y: point.y * TILE + TILE / 2,
  };
}

export function ArrowOverlay({ path }: { path: Point[] }) {
  if (path.length < 2) return null;

  const points = path.map(center);
  const polyline = points.map(point => `${point.x},${point.y}`).join(" ");
  const last = points[points.length - 1];
  const prev = points[points.length - 2];

  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;

  const tip = { x: last.x + ux * 18, y: last.y + uy * 18 };
  const base = { x: last.x - ux * 10, y: last.y - uy * 10 };
  const left = { x: base.x + px * 17, y: base.y + py * 17 };
  const right = { x: base.x - px * 17, y: base.y - py * 17 };
  const innerBase = { x: last.x - ux * 5, y: last.y - uy * 5 };
  const innerLeft = { x: innerBase.x + px * 11, y: innerBase.y + py * 11 };
  const innerRight = { x: innerBase.x - px * 11, y: innerBase.y - py * 11 };

  const outerHead = `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`;
  const innerTip = { x: last.x + ux * 12, y: last.y + uy * 12 };
  const innerHead = `${innerTip.x},${innerTip.y} ${innerLeft.x},${innerLeft.y} ${innerRight.x},${innerRight.y}`;

  return (
    <svg className="pointer-events-none absolute inset-0 z-40" width={W * TILE} height={H * TILE}>
      <motion.polyline
        points={polyline}
        fill="none"
        stroke="rgba(255,255,255,.9)"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.08 }}
      />
      <motion.polyline
        points={polyline}
        fill="none"
        stroke="#ff3b00"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.08 }}
      />
      <motion.polygon
        points={outerHead}
        fill="white"
        stroke="rgba(0,0,0,.2)"
        strokeWidth="1"
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.08 }}
      />
      <motion.polygon
        points={innerHead}
        fill="#ff3b00"
        stroke="#ff9a7a"
        strokeWidth="1"
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.08 }}
      />
    </svg>
  );
}
