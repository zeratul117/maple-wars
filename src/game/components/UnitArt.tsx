import type { CommanderId, UnitType, CommanderDefinition } from "../types";
import { commanders } from "../data/commanders";
import { unitDefs } from "../data/units";

export function UnitArt({
  type,
  commander,
  moving = false,
}: {
  type: UnitType;
  commander: CommanderId;
  moving?: boolean;
}) {
  const art = commanders[commander].units[type];
  const isUrl = art.startsWith("http");
  const commanderObject = commanders[commander];

  function setUnitStyle(commanderProperty: CommanderDefinition, type: UnitType) {
    if (commanderProperty.name === "Balrog" ) {
      if (type === "mech") {
        return "-mt-3 h-13 object-contain";
      }
    }
    if (type === "copter" && commanderProperty.name !== "Athena") {
        return "h-20 w-20 object-contain";
      }
    return "h-10 w-14 object-contain";
  }

  const gifScale: Record<UnitType, number> = {
    infantry: 0.82,
    mech: 0.9,
    recon: 0.98,
    tank: 1.08,
    antiAir: 1.02,
    copter: 1.05,
  };

  if (isUrl) {
    return (
      <span className="relative flex h-[58px] w-[58px] items-center justify-center overflow-visible">
        <img
          src={/\/render\/[^/]+$/.test(art) ? art : `${art}/${moving ? "move" : "stand"}`}
          alt={unitDefs[type].name}
          className={setUnitStyle(commanderObject, type)}
          style={{ transform: `scale(${gifScale[type]})`, transformOrigin: "center bottom" }}
        />
      </span>
    );
  }

  return <span className="flex h-14 w-14 items-center justify-center text-3xl drop-shadow">{art}</span>;
}
