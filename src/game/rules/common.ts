import type { Point, Side, Terrain, Tile, Unit } from "../types";
import {
  CAPTURABLE_TERRAINS,
  CAPTURING_UNIT_TYPES,
  INCOME_TERRAINS,
  PRODUCTION_TERRAINS,
  TILE,
} from "../constants";

export function isCapturableTerrain(type: Terrain) {
  return CAPTURABLE_TERRAINS.has(type);
}

export function isIncomeTerrain(type: Terrain) {
  return INCOME_TERRAINS.has(type);
}

export function isProductionTerrain(type: Terrain) {
  return PRODUCTION_TERRAINS.has(type);
}

export function canCapture(unit: Unit) {
  return CAPTURING_UNIT_TYPES.has(unit.type);
}

export function isFlying(unit: Unit) {
  return unit.type === "copter";
}

export function sideLabel(side: Side) {
  return side === "player" ? "Blue" : "Red";
}

export function unitAt(units: Unit[], point: Point) {
  return units.find(unit => unit.x === point.x && unit.y === point.y);
}

export function key(x: number, y: number) {
  return `${x},${y}`;
}

export function dist(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function center(point: Point) {
  return {
    x: point.x * TILE + TILE / 2,
    y: point.y * TILE + TILE / 2,
  };
}
