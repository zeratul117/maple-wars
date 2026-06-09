import type { UnitDefinition, UnitType } from "../types";

export const unitDefs: Record<UnitType, UnitDefinition> = {
  infantry: { name: "Infantry", cost: 1000, move: 3, attack: 38, range: 1, role: "Captures properties" },
  mech: { name: "Mech", cost: 3000, move: 2, attack: 55, range: 1, role: "Strong foot soldier" },
  recon: { name: "Recon", cost: 4000, move: 8, attack: 45, range: 1, role: "Fast scout unit" },
  tank: { name: "Tank", cost: 7000, move: 6, attack: 72, range: 1, role: "Heavy direct unit" },
  antiAir: { name: "Anti-Air", cost: 8000, move: 6, attack: 55, range: 1, role: "Ground vehicle specialized against air and infantry" },
  copter: { name: "Copter", cost: 9000, move: 6, attack: 65, range: 1, role: "Flying direct unit" },
};
