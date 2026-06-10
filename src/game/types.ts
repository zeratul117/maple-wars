export type Side = "player" | "ai";
export type Screen = "home" | "select" | "game";
export type Terrain =
  | "plain"
  | "forest"
  | "mountain"
  | "road"
  | "river"
  | "bridge"
  | "city"
  | "factory"
  | "airport"
  | "hq"
  | "wall";

export type UnitType = "infantry" | "mech" | "recon" | "tank" | "antiAir" | "copter";
export type CommanderId = "nova" | "ember" | "frost";

export type Tile = {
  x: number;
  y: number;
  type: Terrain;
  owner?: Side | null;
  capture?: number;
};

export type Unit = {
  id: number;
  side: Side;
  commander: CommanderId;
  type: UnitType;
  x: number;
  y: number;
  hp: number;
  acted: boolean;
  moved?: boolean;
  capturing?: boolean;
  animX?: number;
  animY?: number;
};

export type Point = { x: number; y: number };
export type Funds = Record<Side, number>;

export type CombatPreview = {
  attacker: Unit;
  defender: Unit;
  atk: number;
  counter: number;
  returnTo?: Point;
};

export type ActionMenu = {
  x: number;
  y: number;
  tile: Tile;
  enemy?: Unit;
  moveTarget?: Point;
  lockedPath?: Point[];
};

export type UnitTooltip = {
  x: number;
  y: number;
  unitId: number;
};

export type TurnSnapshot = {
  tiles: Map<string, Tile>;
  units: Unit[];
  funds: Funds;
  day: number;
};

export type CommanderDefinition = {
  name: string;
  title: string;
  portrait: string;
  theme: string;
  unitStyle: string;
  description: string;
  passive: string;
  units: Record<UnitType, string>;
};

export type UnitDefinition = {
  name: string;
  cost: number;
  move: number;
  attack: number;
  range: number;
  role: string;
};

export type TerrainDefinition = {
  name: string;
  defense: number;
  move: number;
  icon?: string;
};
