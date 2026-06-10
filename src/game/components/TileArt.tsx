import type { Tile } from "../types";
import { terrainDefs } from "../data/terrain";

export function TileArt({ tile }: { tile: Tile }) {
  const icon = terrainDefs[tile.type].icon;

  return (
    <>
      {tile.type === "forest" && (
        <>
          <img
            src="/terrain/forest.png"
            alt="forest"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </>
      )}

      {tile.type === "mountain" && (
        <>
          <img
            src="/terrain/mountain.png"
            alt="mountain"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </>
      )}

      {tile.type === "road" && (
        <>
          <img
            src="/terrain/road.png"
            alt="road"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </>
      )}

      {tile.type === "river" && (
         <>
          <img
            src="/terrain/water.png"
            alt="river"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </>
      )}

      {tile.type === "plain" && (
        <>
          <img
            src="/terrain/plain.png"
            alt="Plain"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </>
      )}

      {["city", "factory", "hq", "airport"].includes(tile.type) && (
        <>
          <img
            src={icon}
            alt="Plain"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </>
      )}
    </>
  );
}
