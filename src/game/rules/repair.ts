import type { Side, Tile, Unit } from "../types";
import {
  AIR_REPAIR_TERRAINS,
  GROUND_REPAIR_TERRAINS,
  MAX_HP,
  REPAIR_COST_PER_HP_RATE,
  REPAIR_HP_PER_TURN,
} from "../constants";
import { unitDefs } from "../data/units";
import { isFlying, key, sideLabel } from "./common";

export function canRepairOnTile(unit: Unit, tile: Tile) {
  if (tile.owner !== unit.side) return false;
  return (isFlying(unit) ? AIR_REPAIR_TERRAINS : GROUND_REPAIR_TERRAINS).has(tile.type);
}

export function repairUnitsForTurn(units: Unit[], tiles: Map<string, Tile>, funds: number, side: Side) {
  let remainingFunds = funds;
  let totalHealed = 0;
  let totalCost = 0;

  const repairedUnits = units.map(unit => {
    if (unit.side !== side || unit.hp >= MAX_HP) return unit;

    const tile = tiles.get(key(unit.x, unit.y));
    if (!tile || !canRepairOnTile(unit, tile)) return unit;

    const maxHeal = Math.min(REPAIR_HP_PER_TURN, MAX_HP - unit.hp);
    const costPerHp = Math.round(unitDefs[unit.type].cost * REPAIR_COST_PER_HP_RATE);
    const affordableHeal = Math.min(maxHeal, Math.floor(remainingFunds / costPerHp));

    if (affordableHeal <= 0) return unit;

    const repairCost = affordableHeal * costPerHp;
    remainingFunds -= repairCost;
    totalHealed += affordableHeal;
    totalCost += repairCost;

    return {
      ...unit,
      hp: unit.hp + affordableHeal,
    };
  });

  return {
    units: repairedUnits,
    funds: remainingFunds,
    totalHealed,
    totalCost,
  };
}

export function repairSummary(side: Side, totalHealed: number, totalCost: number) {
  if (totalHealed <= 0) return "";
  return `${sideLabel(side)} repaired ${totalHealed * (100 / MAX_HP)}% HP for ${totalCost}G.`;
}
