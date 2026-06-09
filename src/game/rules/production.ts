import type { Tile, UnitType } from "../types";
import { UNIT_TYPES } from "../constants";

export function buildOptionsForTile(tile: Tile): UnitType[] {
  return tile.type === "airport" ? ["copter"] : UNIT_TYPES.filter(type => type !== "copter");
}

export function canProduceUnit(tile: Tile, type: UnitType) {
  return tile.type === "airport"
    ? type === "copter"
    : tile.type === "factory" && type !== "copter";
}
