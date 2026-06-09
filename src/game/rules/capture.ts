import type { Tile, Unit } from "../types";
import { CAPTURE_POINTS } from "../constants";
import { terrainDefs } from "../data/terrain";
import { canCapture, isCapturableTerrain, sideLabel } from "./common";

export type CaptureResult = {
  tile: Tile;
  stillCapturing: boolean;
  message: string;
};

export function resolveCapture(unit: Unit, tile: Tile): CaptureResult | null {
  if (!isCapturableTerrain(tile.type)) return null;
  if (!canCapture(unit)) return null;
  if (tile.owner === unit.side) return null;

  const currentCapture = tile.capture ?? CAPTURE_POINTS;
  const nextCapture = currentCapture - unit.hp;

  if (nextCapture <= 0) {
    return {
      tile: {
        ...tile,
        owner: unit.side,
        capture: CAPTURE_POINTS,
      },
      stillCapturing: false,
      message: `${sideLabel(unit.side)} captured a ${terrainDefs[tile.type].name}.`,
    };
  }

  return {
    tile: {
      ...tile,
      capture: nextCapture,
    },
    stillCapturing: true,
    message: `${terrainDefs[tile.type].name} capture progress: ${CAPTURE_POINTS - nextCapture}/${CAPTURE_POINTS}.`,
  };
}
