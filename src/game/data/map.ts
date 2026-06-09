import type { Side, Terrain, Tile } from "../types";
import { CAPTURABLE_TERRAINS, CAPTURE_POINTS, H, W } from "../constants";

export function makeMap() {
  const layout: Terrain[][] = [
    ["plain","plain","city","plain","forest","plain","road","road","road","plain","forest","plain","city","plain","factory","hq"],
    ["plain","forest","plain","plain","plain","plain","road","river","road","plain","plain","plain","plain","airport","road","road"],
    ["city","river","river","plain","city","plain","road","factory","road","plain","city","plain","river","river","plain","city"],
    ["plain","river","river","plain","plain","forest","road","plain","road","forest","plain","plain","river","river","plain","plain"],
    ["plain","plain","road","road","road","plain","city","plain","city","plain","road","road","road","plain","plain","plain"],
    ["forest","plain","road","plain","road","road","road","plain","plain","road","road","road","plain","road","plain","forest"],
    ["plain","plain","road","plain","forest","mountain","forest","plain","plain","forest","mountain","forest","plain","road","plain","plain"],
    ["factory","road","road","city","plain","forest","plain","road","road","plain","forest","plain","city","road","road","factory"],
    ["factory","road","road","city","plain","forest","plain","road","road","plain","forest","plain","city","road","road","factory"],
    ["plain","plain","road","plain","forest","mountain","forest","plain","plain","forest","mountain","forest","plain","road","plain","plain"],
    ["forest","plain","road","plain","road","road","road","plain","plain","road","road","road","plain","road","plain","forest"],
    ["plain","plain","road","road","road","plain","city","plain","city","plain","road","road","road","plain","plain","plain"],
    ["plain","river","river","plain","plain","forest","road","plain","road","forest","plain","plain","river","river","plain","plain"],
    ["city","river","river","plain","city","plain","road","factory","road","plain","city","plain","river","river","plain","city"],
    ["plain","forest","airport","plain","plain","plain","road","river","road","plain","plain","plain","plain","forest","road","road"],
    ["hq","factory","plain","city","forest","plain","road","road","road","plain","forest","plain","city","plain","plain","plain"]
  ];

  const map = new Map<string, Tile>();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let owner: Side | null = null;
      if (
        (x === 0 && y === 15) ||
        (x === 1 && y === 15) ||
        (x === 0 && y === 8) ||
        (x === 7 && y === 13)
      ) owner = "player";

      if (
        (x === 15 && y === 0) ||
        (x === 14 && y === 0) ||
        (x === 15 && y === 7) ||
        (x === 7 && y === 2)
      ) owner = "ai";
      map.set(`${x},${y}`, {
        x,
        y,
        type: layout[y][x],
        owner,
        capture: CAPTURABLE_TERRAINS.has(layout[y][x]) ? CAPTURE_POINTS : undefined,
      });
    }
  }
  return map;
}
