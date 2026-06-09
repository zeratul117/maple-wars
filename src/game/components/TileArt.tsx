import type { Tile } from "../types";
import { terrainDefs } from "../data/terrain";

export function TileArt({ tile }: { tile: Tile }) {
  const icon = terrainDefs[tile.type].icon;

  return (
    <>
      {tile.type === "forest" && (
        <>
          <span className="absolute left-1 top-2 text-2xl">🌲</span>
          <span className="absolute right-1 top-5 text-2xl">🌲</span>
          <span className="absolute bottom-1 left-5 text-2xl">🌲</span>
        </>
      )}

      {tile.type === "mountain" && (
        <>
          <span className="absolute left-2 top-2 text-3xl">⛰️</span>
          <span className="absolute bottom-1 right-1 text-2xl">⛰️</span>
        </>
      )}

      {tile.type === "road" && (
        <>
          <span className="absolute left-0 top-1/2 h-5 w-full -translate-y-1/2 bg-slate-300" />
          <span className="absolute left-1/2 top-1/2 h-1 w-8 -translate-x-1/2 -translate-y-1/2 bg-white/80" />
        </>
      )}

      {tile.type === "river" && (
        <>
          <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.25)_50%,rgba(255,255,255,.25)_75%,transparent_75%)] bg-[length:18px_18px]" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl text-white/80">≈</span>
        </>
      )}

      {tile.type === "bridge" && (
        <>
          <span className="absolute inset-0 bg-cyan-300" />
          <span className="absolute left-0 top-4 h-7 w-full bg-slate-300" />
          <span className="absolute left-0 top-[27px] h-1 w-full bg-white/80" />
        </>
      )}

      {tile.type === "airport" && (
        <>
          <span className="absolute left-[7px] top-[30px] h-[12px] w-[42px] -rotate-[24deg] rounded-[4px] bg-slate-700 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" />
          <span className="absolute left-[18px] top-[31px] h-[2px] w-[5px] -rotate-[24deg] bg-white/90" />
          <span className="absolute left-[25px] top-[34px] h-[2px] w-[5px] -rotate-[24deg] bg-white/90" />
          <span className="absolute left-[32px] top-[37px] h-[2px] w-[5px] -rotate-[24deg] bg-white/90" />
          <span className="absolute left-[7px] top-[10px] h-[16px] w-[16px] rounded-sm bg-slate-100 shadow-[0_2px_0_rgba(0,0,0,.25)]" />
          <span className="absolute left-[11px] top-[4px] h-[8px] w-[8px] rounded-t-sm bg-slate-300 shadow-[0_1px_0_rgba(0,0,0,.2)]" />
          <span className="absolute left-[9px] top-[15px] h-[2px] w-[10px] rounded-full bg-cyan-300/90" />
          <span className="absolute right-[6px] top-[8px] text-[12px] drop-shadow">✈️</span>
        </>
      )}

      {["city", "factory", "hq"].includes(tile.type) && (
        <span className="absolute inset-0 flex items-center justify-center text-4xl drop-shadow">{icon}</span>
      )}
    </>
  );
}
