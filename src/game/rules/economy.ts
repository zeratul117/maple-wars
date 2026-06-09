import type { Funds, Side, Tile, Unit } from "../types";
import { INCOME_PER_PROPERTY } from "../constants";
import { makeMap } from "../data/map";
import { isIncomeTerrain } from "./common";

export function propertyIncome(tiles: Map<string, Tile>, side: Side) {
  return [...tiles.values()].filter(tile => tile.owner === side && isIncomeTerrain(tile.type)).length * INCOME_PER_PROPERTY;
}

export function startingFunds(tiles: Map<string, Tile>): Funds {
  return {
    player: propertyIncome(tiles, "player"),
    ai: propertyIncome(tiles, "ai"),
  };
}

export function createFreshGameState() {
  const tiles = makeMap();

  return {
    tiles,
    units: [] as Unit[],
    turn: "player" as Side,
    day: 1,
    funds: startingFunds(tiles),
  };
}
