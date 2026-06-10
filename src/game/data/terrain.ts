import type { Terrain, TerrainDefinition } from "../types";

export const terrainDefs: Record<Terrain, TerrainDefinition> = {
  plain: { name: "Plain", defense: 1, move: 1 },
  forest: { name: "Woods", defense: 2, move: 2, icon: "🌲" },
  mountain: { name: "Mountain", defense: 4, move: 3, icon: "⛰️" },
  road: { name: "Road", defense: 0, move: 1 },
  river: { name: "River", defense: 0, move: 99 },
  bridge: { name: "Bridge", defense: 0, move: 1 },
  city: { name: "City", defense: 3, move: 1, icon: "/terrain/city.png" },
  factory: { name: "Factory", defense: 3, move: 1, icon: "/terrain/factory.png" },
  airport: { name: "Airport", defense: 3, move: 1, icon: "/terrain/airport.png" },
  hq: { name: "HQ", defense: 4, move: 1, icon: "/terrain/hq.png" },
  wall: { name: "Wall", defense: 0, move: 99, icon: "🧱" },
};
