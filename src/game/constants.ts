import type { CommanderId, Terrain, UnitType } from "./types";

// Core board constants.
export const W = 19;
export const H = 16;
export const TILE = 48;

// Shared lists used by UI and rules.
export const COMMANDER_IDS: CommanderId[] = ["nova", "ember", "frost"];
export const UNIT_TYPES: UnitType[] = ["infantry", "mech", "recon", "tank", "antiAir", "copter"];

export const CAPTURING_UNIT_TYPES = new Set<UnitType>(["infantry", "mech"]);
export const CAPTURABLE_TERRAINS = new Set<Terrain>(["city", "factory", "airport", "hq"]);
export const INCOME_TERRAINS = new Set<Terrain>(["city", "factory", "airport", "hq"]);
export const PRODUCTION_TERRAINS = new Set<Terrain>(["factory", "airport"]);
export const GROUND_REPAIR_TERRAINS = new Set<Terrain>(["city", "factory"]);
export const AIR_REPAIR_TERRAINS = new Set<Terrain>(["airport"]);

export const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

// Game rule numbers.
export const MAX_HP = 10;
export const CAPTURE_POINTS = 20;
export const INCOME_PER_PROPERTY = 1000;
export const REPAIR_HP_PER_TURN = 2;
export const REPAIR_COST_PER_HP_RATE = 0.1;
