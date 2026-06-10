import type { Side, Terrain, Tile } from "../types";
import { CAPTURABLE_TERRAINS, CAPTURE_POINTS, H, W } from "../constants";

export function makeMap() {
  const layout: Terrain[][] = [
    ["mountain","mountain","forest","plain","forest","wall","wall","mountain","mountain","mountain","plain","road","road","plain","road","factory","wall","wall","mountain"],
    ["forest","airport","wall","wall","road","wall","city","road","road","plain","forest","road","factory","plain","plain","forest","city","wall","wall"],
    ["river","wall","wall","plain","plain","city","road","plain","hq","plain","plain","wall","wall","plain","mountain","plain","road","road","wall"],
    ["river","road","factory","forest","plain","plain","forest","plain","plain","plain","city","plain","road","forest","mountain","plain","plain","road","wall"],
    ["road","road","city","mountain","mountain","plain","plain","plain","forest","road","plain","plain","wall","wall","plain","mountain","plain","road","city"],
    ["plain","mountain","mountain","plain","plain","plain","city","plain","plain","road","road","city","plain","road","plain","plain","forest","plain","forest"],
    ["plain","forest","plain","city","road","plain","plain","plain","forest","city","plain","plain","plain","wall","plain","city","plain","plain","forest"],
    ["plain","plain","plain","plain","plain","road","road","plain","forest","mountain","plain","plain","city","plain","road","road","plain","city","plain"],
    ["plain","city","plain","road","road","plain","city","plain","plain","mountain","forest","plain","road","road","plain","plain","plain","plain","plain"],
    ["forest","plain","plain","city","plain","wall","plain","plain","plain","city","forest","plain","plain","plain","road","city","plain","forest","plain"],
    ["forest","plain","forest","plain","plain","road","plain","city","road","road","plain","plain","city","plain","plain","plain","mountain","mountain","plain"],
    ["city","road","plain","mountain","plain","wall","wall","plain","plain","road","forest","plain","plain","plain","mountain","mountain","city","road","road"],
    ["wall","road","plain","plain","mountain","forest","road","plain","city","plain","plain","plain","forest","plain","plain","forest","factory","road","river"],
    ["wall","road","road","plain","mountain","plain","wall","wall","plain","plain","hq","plain","road","city","plain","plain","wall","wall","river"],
    ["wall","wall","city","forest","plain","plain","factory","road","forest","plain","road","road","city","wall","road","wall","wall","airport","forest"],
    ["mountain","wall","wall","factory","road","plain","road","road","plain","mountain","mountain","mountain","wall","wall","forest","plain","forest","mountain","mountain"]
  ];

  const map = new Map<string, Tile>();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let owner: Side | null = null;
      if (
        (x === 3 && y === 15) ||
        (x === 16 && y === 12) ||
        (x === 10 && y === 13)
      ) owner = "player";

      if (
        (x === 15 && y === 0) ||
        (x === 2 && y === 3) ||
        (x === 8 && y === 2)
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
