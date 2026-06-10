import type { Point, Tile, Unit } from "../types";
import { DIRECTIONS, H, W } from "../constants";
import { terrainDefs } from "../data/terrain";
import { unitDefs } from "../data/units";
import { isFlying, key, dist, unitAt } from "./common";

export function effectiveMove(unit: Unit) {
  const darkLordMechBonus = unit.commander === "nova" && unit.type === "mech" ? 1 : 0;
  return unitDefs[unit.type].move + darkLordMechBonus;
}

export function isBlockedByEnemy(unit: Unit, point: Point, units: Unit[]) {
  const occupyingUnit = unitAt(units, point);
  return !!occupyingUnit && occupyingUnit.id !== unit.id && occupyingUnit.side !== unit.side;
}

export function canEndMovementOn(unit: Unit, point: Point, units: Unit[]) {
  const occupyingUnit = unitAt(units, point);
  return !occupyingUnit || occupyingUnit.id === unit.id;
}

export function moveCost(unit: Unit, tile: Tile) {
  //No one can move over walls
  if (tile.type === "wall") return 99;

  if (isFlying(unit)) return 1;
  if (tile.type === "river") return 99;

  switch (unit.type) {
    case "infantry":
      return tile.type === "mountain" ? 2 : 1;
    case "mech":
      return tile.type === "mountain" ? 1 : 1;
    case "recon":
      if (tile.type === "mountain") return 99;
      if (tile.type === "plain") return 2;
      if (tile.type === "forest") return 3;
      return 1;
    case "tank":
    case "antiAir":
      if (tile.type === "mountain") return 99;
      return tile.type === "forest" ? 2 : 1;
    default:
      return terrainDefs[tile.type].move;
  }
}

export function reachable(unit: Unit, units: Unit[], tiles: Map<string, Tile>) {
  const best = new Map<string, number>();
  const q = [{ x: unit.x, y: unit.y, left: effectiveMove(unit) }];
  best.set(key(unit.x, unit.y), effectiveMove(unit));

  while (q.length) {
    const cur = q.shift()!;
    for (const [dx, dy] of DIRECTIONS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const nextPoint = { x: nx, y: ny };

      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;

      const tile = tiles.get(key(nx, ny))!;
      const cost = moveCost(unit, tile);

      // Enemy units are walls. Friendly units can be crossed, but cannot be the final landing spot.
      if (cost > cur.left || isBlockedByEnemy(unit, nextPoint, units)) continue;

      const left = cur.left - cost;
      if (!best.has(key(nx, ny)) || best.get(key(nx, ny))! < left) {
        best.set(key(nx, ny), left);
        q.push({ x: nx, y: ny, left });
      }
    }
  }

  return best;
}

export function pathTo(start: Point, target: Point, reach: Map<string, number>) {
  if (!reach.has(key(target.x, target.y))) return [];

  const path: Point[] = [target];
  let cur = target;

  while (!(cur.x === start.x && cur.y === start.y)) {
    const neighbors = DIRECTIONS
      .map(([dx, dy]) => ({ x: cur.x + dx, y: cur.y + dy }))
      .filter(point => reach.has(key(point.x, point.y)));

    const currentLeft = reach.get(key(cur.x, cur.y)) ?? -1;
    const next = neighbors.sort((a, b) => {
      const scoreA = (reach.get(key(a.x, a.y)) ?? -1) - currentLeft - dist(a, start) * 0.01;
      const scoreB = (reach.get(key(b.x, b.y)) ?? -1) - currentLeft - dist(b, start) * 0.01;
      return scoreB - scoreA;
    })[0];

    if (!next || path.some(point => point.x === next.x && point.y === next.y)) break;

    cur = next;
    path.unshift(cur);
  }

  return path;
}

export function pathMoveCost(path: Point[], tiles: Map<string, Tile>, unit?: Unit) {
  return path.slice(1).reduce((total, point) => {
    const tile = tiles.get(key(point.x, point.y));
    return total + (tile ? (unit ? moveCost(unit, tile) : terrainDefs[tile.type].move) : 99);
  }, 0);
}
