import type { Tile, Unit, UnitType } from "../types";
import { MAX_HP } from "../constants";
import { terrainDefs } from "../data/terrain";
import { isFlying, key } from "./common";

const matchupDamage: Record<UnitType, Record<UnitType, number>> = {
  infantry: { infantry: 55, mech: 45, recon: 12, tank: 5, antiAir: 5, copter: 7 },
  mech: { infantry: 65, mech: 55, recon: 85, tank: 55, antiAir: 65, copter: 9 },
  recon: { infantry: 70, mech: 65, recon: 35, tank: 6, antiAir: 4, copter: 10 },
  tank: { infantry: 75, mech: 70, recon: 85, tank: 55, antiAir: 65, copter: 10 },
  antiAir: { infantry: 105, mech: 105, recon: 60, tank: 25, antiAir: 45, copter: 120 },
  copter: { infantry: 75, mech: 75, recon: 55, tank: 55, antiAir: 25, copter: 65 },
};

export function baseDamage(attacker: Unit, defender: Unit) {
  return matchupDamage[attacker.type][defender.type];
}

export function attackPassiveMultiplier(unit: Unit) {
  if (unit.commander === "nova") {
    if (unit.type === "infantry") return 1.2;
    if (unit.type !== "mech") return 0.9;
  }

  if (unit.commander === "ember" && unit.type === "copter") return 1.1;

  return 1;
}

export function damageTakenPassiveMultiplier(unit: Unit) {
  return unit.commander === "frost" && unit.type === "tank" ? 0.9 : 1;
}

export function defenderTerrainDefense(unit: Unit, tiles: Map<string, Tile>) {
  return isFlying(unit) ? 0 : terrainDefs[tiles.get(key(unit.x, unit.y))!.type].defense;
}

export function damagePercent(attacker: Unit, defender: Unit, tiles: Map<string, Tile>) {
  const base = baseDamage(attacker, defender);
  const attackerHpScale = Math.max(0.1, attacker.hp / MAX_HP);
  const terrain = defenderTerrainDefense(defender, tiles);
  const terrainReduction = terrain * defender.hp;
  const scaledDamage = base * attackerHpScale * attackPassiveMultiplier(attacker);
  const damageAfterTerrain = scaledDamage - terrainReduction;
  const damageAfterPassiveDefense = damageAfterTerrain * damageTakenPassiveMultiplier(defender);
  return Math.max(1, Math.min(120, Math.round(damageAfterPassiveDefense)));
}
