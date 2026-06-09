import { MAX_HP } from "../constants";

export function HpNumber({ value }: { value: number }) {
  const ratio = Math.max(0, Math.min(1, value / MAX_HP));
  const hpColor = `rgb(255, ${Math.round(40 + ratio * 120)}, 20)`;

  return (
    <span className="hp-number" style={{ color: hpColor }}>
      {value}
    </span>
  );
}
