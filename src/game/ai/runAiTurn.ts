import type { CommanderId, Funds, Point, Side, Tile, TurnSnapshot, Unit, UnitType } from "../types";
import { MAX_HP } from "../constants";
import { terrainDefs } from "../data/terrain";
import { unitDefs } from "../data/units";
import { damagePercent } from "../rules/combat";
import { canCapture, dist, isCapturableTerrain, isProductionTerrain, key, unitAt } from "../rules/common";
import { propertyIncome } from "../rules/economy";
import { canEndMovementOn, effectiveMove, moveCost, pathTo, reachable } from "../rules/movement";
import { canProduceUnit } from "../rules/production";
import { canRepairOnTile, repairSummary, repairUnitsForTurn } from "../rules/repair";
import { resolveCapture } from "../rules/capture";

type RunAiTurnParams = {
  units: Unit[];
  tiles: Map<string, Tile>;
  funds: Funds;
  day: number;
  aiCommander: CommanderId;
  setTiles: (tiles: Map<string, Tile>) => void;
  setUnits: (units: Unit[]) => void;
  setFunds: (funds: Funds) => void;
  setDay: (day: number) => void;
  setTurnSnapshot: (snapshot: TurnSnapshot) => void;
  setTurn: (turn: Side) => void;
  setMovingUnitId: (id: number | null) => void;
  setMessage: (message: string) => void;
};

type AttackResult = {
  enemy: Unit;
  atk: number;
  counter: number;
  defenderHpAfterHit: number;
  attackerHpAfterCounter: number;
  kills: boolean;
  score: number;
};

type BuildNeed = {
  type: UnitType;
  reason: string;
  score: number;
};

const DIRECTIONS: Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const BLOCKED = 99;
const CAPTURE_POINTS_TOTAL = 20;

function hpDamage(percent: number) {
  return Math.ceil(percent / MAX_HP);
}

function isIncomeProperty(tile: Tile) {
  return tile.type === "city" || tile.type === "factory" || tile.type === "airport" || tile.type === "hq";
}

function isVehicle(type: UnitType) {
  return type === "recon" || type === "tank" || type === "antiAir";
}

function isAirThreat(unit: Unit) {
  return unit.type === "copter";
}

function isGroundThreat(unit: Unit) {
  return unit.type === "tank" || unit.type === "recon" || unit.type === "antiAir" || unit.type === "mech";
}

export async function runAiTurn({
  units,
  tiles,
  funds,
  day,
  aiCommander,
  setTiles,
  setUnits,
  setFunds,
  setDay,
  setTurnSnapshot,
  setTurn,
  setMovingUnitId,
  setMessage,
}: RunAiTurnParams) {
  let simUnits = units.map(unit => unit.side === "ai" ? { ...unit, acted: false, moved: false } : { ...unit });
  let simTiles = new Map(tiles);
  let simFunds = { ...funds, ai: funds.ai + propertyIncome(tiles, "ai") };

  const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

  const sync = async (message: string, ms = 350) => {
    setTiles(new Map(simTiles));
    setUnits(simUnits.map(unit => ({ ...unit })));
    setMessage(message);
    await wait(ms);
  };

  const tileAt = (point: Point) => simTiles.get(key(point.x, point.y));

  const aiUnits = () => simUnits.filter(unit => unit.side === "ai");
  const playerUnits = () => simUnits.filter(unit => unit.side === "player");
  const aiProperties = () => [...simTiles.values()].filter(tile => tile.owner === "ai" && isIncomeProperty(tile));
  const aiCapturers = () => aiUnits().filter(unit => canCapture(unit));
  const aiCombatUnits = () => aiUnits().filter(unit => !canCapture(unit));
  const countType = (type: UnitType) => aiUnits().filter(unit => unit.type === type).length;

  // Strategic pathing respects walls/terrain, but ignores temporary unit blockers.
  // This is used to decide objectives, not exact animation pathing.
  const strategicPathCost = (unit: Unit, from: Point, target: Point) => {
    const startKey = key(from.x, from.y);
    const targetKey = key(target.x, target.y);
    const best = new Map<string, number>([[startKey, 0]]);
    const queue = [{ point: from, cost: 0 }];

    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      const currentKey = key(current.point.x, current.point.y);

      if (currentKey === targetKey) return current.cost;
      if (current.cost > (best.get(currentKey) ?? Infinity)) continue;

      for (const direction of DIRECTIONS) {
        const next = {
          x: current.point.x + direction.x,
          y: current.point.y + direction.y,
        };

        const tile = tileAt(next);
        if (!tile) continue;

        const cost = moveCost(unit, tile);
        if (cost >= BLOCKED) continue;

        const nextCost = current.cost + cost;
        const nextKey = key(next.x, next.y);

        if (nextCost < (best.get(nextKey) ?? Infinity)) {
          best.set(nextKey, nextCost);
          queue.push({ point: next, cost: nextCost });
        }
      }
    }

    return Infinity;
  };

  const turnsTo = (unit: Unit, target: Point) => {
    const cost = strategicPathCost(unit, unit, target);
    return Number.isFinite(cost) ? Math.ceil(cost / Math.max(1, effectiveMove(unit))) : Infinity;
  };

  const canReachEventually = (unit: Unit, target: Point) => Number.isFinite(strategicPathCost(unit, unit, target));

  const reachableMovePoints = (unit: Unit) => {
    const unitReach = reachable(unit, simUnits, simTiles);

    return [...unitReach.keys()]
      .map(value => {
        const [x, y] = value.split(",").map(Number);
        return { x, y };
      })
      .filter(point => canEndMovementOn(unit, point, simUnits));
  };

  const isHighValueProperty = (tile: Tile) => {
    return tile.type === "hq" || tile.type === "factory" || tile.type === "airport";
  };

  const propertyBaseValue = (tile: Tile) => {
    if (tile.type === "hq") return tile.owner === "player" ? 30000 : 16000;
    if (tile.type === "factory") return tile.owner === "player" ? 22000 : 20000;
    if (tile.type === "airport") return tile.owner === "player" ? 20500 : 18500;
    if (tile.type === "city") return tile.owner === "player" ? 6500 : 5000;
    return 0;
  };

  const propertyTargetReason = (tile: Tile) => {
    if (tile.type === "hq") return "enemy HQ";
    if (tile.type === "factory") return tile.owner === null ? "nearby neutral factory" : "enemy factory";
    if (tile.type === "airport") return tile.owner === null ? "nearby neutral airport" : "enemy airport";
    return tile.owner === null ? "neutral city" : "enemy city";
  };

  const bestPropertyTargetFor = (unit: Unit, reservedTargets: Set<string>) => {
    const candidates = [...simTiles.values()]
      .filter(tile => isCapturableTerrain(tile.type) && tile.owner !== "ai")
      .map(tile => {
        const travelTurns = turnsTo(unit, tile);
        const captureProgress = CAPTURE_POINTS_TOTAL - (tile.capture ?? CAPTURE_POINTS_TOTAL);
        const reserved = reservedTargets.has(key(tile.x, tile.y));

        // Do not send multiple capturers to the same low-value target.
        // High-value buildings can still receive backup if they are very important.
        const reservationPenalty = reserved
          ? isHighValueProperty(tile) ? 5500 : 12000
          : 0;

        const closeBonus =
          travelTurns <= 1 ? 12000 :
          travelTurns <= 2 ? 9000 :
          travelTurns <= 3 ? 6500 :
          travelTurns <= 4 ? 3500 :
          0;

        const highValueVicinityBonus =
          isHighValueProperty(tile) && travelTurns <= 5 ? 9000 : 0;

        const cityPenalty =
          tile.type === "city" && [...simTiles.values()].some(other =>
            isHighValueProperty(other) &&
            other.owner !== "ai" &&
            turnsTo(unit, other) <= Math.max(1, travelTurns + 2)
          )
            ? 4500
            : 0;

        const score =
          propertyBaseValue(tile) +
          closeBonus +
          highValueVicinityBonus +
          captureProgress * 650 -
          travelTurns * 1800 -
          reservationPenalty -
          cityPenalty;

        return { tile, score, travelTurns };
      })
      .filter(option => Number.isFinite(option.travelTurns));

    // Hard rule: if a factory or airport is nearby, capture that before random cities.
    const nearbyProduction = candidates
      .filter(option => (option.tile.type === "factory" || option.tile.type === "airport") && option.travelTurns <= 5)
      .sort((a, b) =>
        b.score - a.score ||
        a.travelTurns - b.travelTurns
      )[0];

    if (nearbyProduction) return nearbyProduction.tile;

    return candidates
      .sort((a, b) =>
        b.score - a.score ||
        a.travelTurns - b.travelTurns
      )[0]?.tile ?? null;
  };

  const shouldCaptureLandedTile = (unit: Unit, landedTile: Tile, intendedTarget: Tile) => {
    if (!isCapturableTerrain(landedTile.type) || landedTile.owner === "ai") return false;
    if (key(landedTile.x, landedTile.y) === key(intendedTarget.x, intendedTarget.y)) return true;
    if (isHighValueProperty(landedTile)) return true;

    // If the unit is moving toward a factory, airport, or HQ, do not get distracted
    // by a random city on the way.
    if (isHighValueProperty(intendedTarget)) return false;

    return true;
  };

  const canBeKilledNextTurn = (unit: Unit, point: Point) => {
    const virtualTarget = { ...unit, x: point.x, y: point.y };

    return playerUnits().some(enemy => {
      const canReachAttackRange = strategicPathCost(enemy, enemy, point) <= effectiveMove(enemy) + unitDefs[enemy.type].range;
      if (!canReachAttackRange) return false;

      return hpDamage(damagePercent(enemy, virtualTarget, simTiles)) >= unit.hp;
    });
  };

  const bestMoveToward = (unit: Unit, target: Point, avoidDeath = false) => {
    const currentRemainingCost = strategicPathCost(unit, unit, target);

    return reachableMovePoints(unit)
      .map(point => {
        const remainingCost = strategicPathCost(unit, point, target);
        const tile = tileAt(point);
        const deathPenalty = avoidDeath && canBeKilledNextTurn(unit, point) ? 50000 : 0;
        const defenseBonus = tile ? terrainDefs[tile.type].defense * (canCapture(unit) ? 4 : 20) : 0;
        const stayPenalty = point.x === unit.x && point.y === unit.y ? 250 : 0;

        // Capture units should not climb onto mountains just because the defense is good.
        // They should mainly move closer to the chosen property.
        const captureMountainPenalty = canCapture(unit) && tile?.type === "mountain" ? 350 : 0;
        const noProgressPenalty = remainingCost >= currentRemainingCost ? 1200 : 0;

        return {
          point,
          score:
            remainingCost +
            deathPenalty +
            stayPenalty +
            captureMountainPenalty +
            noProgressPenalty -
            defenseBonus,
        };
      })
      .filter(option => Number.isFinite(option.score))
      .sort((a, b) => a.score - b.score)[0]?.point ?? unit;
  };

  const attackResult = (attacker: Unit, defender: Unit): AttackResult => {
    const atk = damagePercent(attacker, defender, simTiles);
    const defenderHpAfterHit = Math.max(0, defender.hp - hpDamage(atk));
    const damagedDefender = { ...defender, hp: defenderHpAfterHit };
    const canCounter = defenderHpAfterHit > 0 && dist(defender, attacker) <= unitDefs[defender.type].range;
    const counter = canCounter ? damagePercent(damagedDefender, attacker, simTiles) : 0;
    const attackerHpAfterCounter = Math.max(0, attacker.hp - hpDamage(counter));
    const kills = defenderHpAfterHit <= 0;

    const defenderHpLost = defender.hp - defenderHpAfterHit;
    const attackerHpLost = attacker.hp - attackerHpAfterCounter;
    const valueDamageDone = (defenderHpLost / MAX_HP) * unitDefs[defender.type].cost;
    const valueDamageTaken = (attackerHpLost / MAX_HP) * unitDefs[attacker.type].cost;
    const killBonus = kills ? unitDefs[defender.type].cost * 0.85 : 0;
    const deathPenalty = attackerHpAfterCounter <= 0 ? unitDefs[attacker.type].cost * 1.4 : 0;

    return {
      enemy: defender,
      atk,
      counter,
      defenderHpAfterHit,
      attackerHpAfterCounter,
      kills,
      score: valueDamageDone + killBonus - valueDamageTaken - deathPenalty,
    };
  };

  const isCaptureInterruptTarget = (enemy: Unit) => {
    if (enemy.capturing) return true;

    const enemyTile = tileAt(enemy);
    if (!enemyTile || !isCapturableTerrain(enemyTile.type)) return false;

    // A player infantry/mech sitting on an AI factory, airport, or HQ is a major problem,
    // even before the capture flag is visible.
    return enemyTile.owner === "ai" && isHighValueProperty(enemyTile) && canCapture(enemy);
  };

  const attackPriority = (attacker: Unit, result: AttackResult) => {
    const enemyTile = tileAt(result.enemy);
    const interruptBonus = isCaptureInterruptTarget(result.enemy) ? 9000 : 0;
    const highValueTileBonus =
      enemyTile && isCapturableTerrain(enemyTile.type) && isHighValueProperty(enemyTile)
        ? 2500
        : 0;
    const footSoldierBonus =
      canCapture(attacker) && (result.enemy.type === "infantry" || result.enemy.type === "mech")
        ? 1200
        : 0;

    return result.score + interruptBonus + highValueTileBonus + footSoldierBonus;
  };

  const isGoodAttack = (unit: Unit, result: AttackResult) => {
    if (result.attackerHpAfterCounter <= 0) return false;
    if (result.kills) return true;

    const priority = attackPriority(unit, result);

    // Infantry and Mechs should still capture, but they must also fight when they can
    // interrupt captures or make a reasonable trade.
    if (canCapture(unit)) {
      if (isCaptureInterruptTarget(result.enemy) && result.atk >= 10) return true;
      return priority >= 900 || (result.atk >= 20 && result.atk >= result.counter - 20);
    }

    return priority >= 250 || result.atk >= result.counter + 15;
  };

  const bestCurrentAttack = (unit: Unit) => {
    return playerUnits()
      .filter(enemy => dist(unit, enemy) <= unitDefs[unit.type].range)
      .map(enemy => attackResult(unit, enemy))
      .filter(result => isGoodAttack(unit, result))
      .sort((a, b) => attackPriority(unit, b) - attackPriority(unit, a))[0] ?? null;
  };

  const bestAttackAfterMove = (unit: Unit) => {
    let best: { point: Point; result: AttackResult; priority: number } | null = null;

    for (const point of reachableMovePoints(unit)) {
      const virtualAttacker = { ...unit, x: point.x, y: point.y };

      for (const enemy of playerUnits()) {
        if (dist(virtualAttacker, enemy) > unitDefs[unit.type].range) continue;

        const result = attackResult(virtualAttacker, enemy);
        if (!isGoodAttack(virtualAttacker, result)) continue;

        const movePenalty = point.x === unit.x && point.y === unit.y ? 0 : 100;
        const priority = attackPriority(virtualAttacker, result) - movePenalty;

        if (!best || priority > best.priority) {
          best = { point, result, priority };
        }
      }
    }

    return best;
  };

  const nearestRepairTile = (unit: Unit) => {
    return aiProperties()
      .filter(tile => canRepairOnTile(unit, tile))
      .map(tile => ({ tile, travelTurns: turnsTo(unit, tile) }))
      .filter(option => Number.isFinite(option.travelTurns))
      .sort((a, b) => a.travelTurns - b.travelTurns)[0]?.tile ?? null;
  };

  const shouldRetreat = (unit: Unit) => {
    const currentTile = tileAt(unit);

    if (currentTile && canCapture(unit) && isCapturableTerrain(currentTile.type) && currentTile.owner !== "ai") {
      return unit.hp <= 2 && canBeKilledNextTurn(unit, unit);
    }

    if (unit.hp <= 3 && nearestRepairTile(unit)) return true;
    if (unit.hp <= 5 && canBeKilledNextTurn(unit, unit) && nearestRepairTile(unit)) return true;

    return false;
  };

  const captureIfPossible = (unit: Unit, nextTiles: Map<string, Tile>) => {
    const tile = nextTiles.get(key(unit.x, unit.y))!;
    const result = resolveCapture(unit, tile);

    if (!result) return false;

    nextTiles.set(key(unit.x, unit.y), result.tile);
    setMessage(result.message);
    return result.stillCapturing;
  };

  const moveAIUnit = async (unit: Unit, target: Point, message: string) => {
    const aiReach = reachable(unit, simUnits, simTiles);
    const path = pathTo(unit, target, aiReach);

    if (path.length <= 1) return unit;

    setMovingUnitId(unit.id);
    setMessage(message);

    for (const step of path.slice(1)) {
      await wait(150);
      simUnits = simUnits.map(current => current.id === unit.id ? { ...current, x: step.x, y: step.y, capturing: false } : current);
      setUnits(simUnits.map(current => ({ ...current })));
    }

    setMovingUnitId(null);

    const moved = simUnits.find(current => current.id === unit.id)!;
    await sync(`Red ${unitDefs[moved.type].name} moved.`, 250);

    return moved;
  };

  const performAttack = async (attacker: Unit, result: AttackResult) => {
    await sync(`Red ${unitDefs[attacker.type].name} attacks for ${result.atk}%. You counter for ${result.counter}%.`, 500);

    simUnits = simUnits
      .map(unit => unit.id === result.enemy.id ? { ...unit, hp: result.defenderHpAfterHit } : unit)
      .filter(unit => unit.hp > 0);

    if (result.counter > 0) {
      simUnits = simUnits
        .map(unit => unit.id === attacker.id ? { ...unit, hp: result.attackerHpAfterCounter } : unit)
        .filter(unit => unit.hp > 0);
    }

    simUnits = simUnits.map(unit => unit.id === attacker.id ? { ...unit, acted: true, moved: false, capturing: false } : unit);
    await sync("Combat resolved.", 450);
  };

  const retreatUnit = async (unit: Unit) => {
    const repairTile = nearestRepairTile(unit);
    if (!repairTile) return false;

    const currentTile = tileAt(unit);
    if (currentTile && canRepairOnTile(unit, currentTile)) {
      simUnits = simUnits.map(current => current.id === unit.id ? { ...current, acted: true } : current);
      await sync(`Red ${unitDefs[unit.type].name} waits on a repair building.`, 400);
      return true;
    }

    const target = bestMoveToward(unit, repairTile, true);
    const moved = await moveAIUnit(unit, target, `Red ${unitDefs[unit.type].name} retreats to repair.`);
    simUnits = simUnits.map(current => current.id === moved.id ? { ...current, acted: true } : current);
    return true;
  };

  const threatNear = (building: Tile, predicate: (unit: Unit) => boolean, radius: number) => {
    return playerUnits()
      .filter(predicate)
      .filter(unit => dist(unit, building) <= radius)
      .length;
  };

  // Repair first.
  const aiRepairs = repairUnitsForTurn(simUnits, simTiles, simFunds.ai, "ai");
  simUnits = aiRepairs.units;
  simFunds.ai = aiRepairs.funds;

  if (aiRepairs.totalHealed > 0) {
    await sync(repairSummary("ai", aiRepairs.totalHealed, aiRepairs.totalCost), 450);
  }

  // Production is deliberately balanced:
  // enough capture units to expand, but then spend on tanks/recons/anti-air/copiers instead of stacking cash.
  const openProperties = [...simTiles.values()].filter(tile => isCapturableTerrain(tile.type) && tile.owner !== "ai");
  const openFactoriesOrAirports = openProperties.filter(tile => tile.type === "factory" || tile.type === "airport");
  const nearbyOpenFactoriesOrAirports = openFactoriesOrAirports.filter(tile =>
    aiCapturers().some(unit => turnsTo(unit, tile) <= 6) ||
    aiProperties().some(property => dist(property, tile) <= 8)
  );
  const desiredCapturers = Math.min(
    6,
    Math.max(3, nearbyOpenFactoriesOrAirports.length + Math.ceil(openProperties.length / 10))
  );
  const aiIncomeCount = aiProperties().length;
  const totalAiCombat = aiCombatUnits().length;
  const playerCopterCount = playerUnits().filter(unit => unit.type === "copter").length;
  const desiredAntiAir = playerCopterCount > 0 ? Math.max(1, playerCopterCount) : 0;

  const buildNeedsFor = (building: Tile): BuildNeed[] => {
    const needs: BuildNeed[] = [];
    const capturers = aiCapturers().length;
    const copterThreat = threatNear(building, isAirThreat, 9);
    const groundThreat = threatNear(building, isGroundThreat, 8);
    const hasLotsOfMoney = simFunds.ai >= 10000;
    const needsCapturePressure = capturers < desiredCapturers;

    if (building.type === "airport") {
      if (simFunds.ai >= unitDefs.copter.cost) {
        needs.push({
          type: "copter",
          reason: "air support",
          score:
            700 +
            copterThreat * 500 +
            (countType("copter") === 0 ? 450 : 0) +
            (aiIncomeCount >= 6 ? 250 : 0) -
            countType("copter") * 300,
        });
      }

      return needs;
    }

    if (building.type !== "factory") return needs;

    if (simFunds.ai >= unitDefs.antiAir.cost) {
      needs.push({
        type: "antiAir",
        reason: "counter copters",
        score:
          copterThreat * 1600 +
          (countType("antiAir") < desiredAntiAir ? 900 : 0) -
          countType("antiAir") * 250,
      });
    }

    if (simFunds.ai >= unitDefs.tank.cost) {
      needs.push({
        type: "tank",
        reason: "main combat pressure",
        score:
          900 +
          groundThreat * 500 +
          (hasLotsOfMoney ? 1200 : 0) +
          (totalAiCombat < Math.ceil(aiCapturers().length / 2) ? 500 : 0) -
          countType("tank") * 150,
      });
    }

    if (simFunds.ai >= unitDefs.recon.cost) {
      needs.push({
        type: "recon",
        reason: "fast support",
        score:
          550 +
          (countType("recon") === 0 ? 400 : 0) +
          (openProperties.length > 6 ? 150 : 0) -
          countType("recon") * 350,
      });
    }

    if (simFunds.ai >= unitDefs.mech.cost) {
      needs.push({
        type: "mech",
        reason: "strong capture",
        score:
          650 +
          (needsCapturePressure ? 900 : 0) +
          (aiIncomeCount >= 5 ? 200 : 0) -
          countType("mech") * 120,
      });
    }

    if (simFunds.ai >= unitDefs.infantry.cost) {
      needs.push({
        type: "infantry",
        reason: "capture",
        score:
          600 +
          (needsCapturePressure ? 1000 : 0) -
          countType("infantry") * 90,
      });
    }

    // Do not build more infantry/mechs forever. Once enough capturers exist, make combat units more appealing.
    if (!needsCapturePressure) {
      for (const need of needs) {
        if (need.type === "infantry" || need.type === "mech") need.score -= 800;
        if (need.type === "tank" || need.type === "antiAir" || need.type === "recon") need.score += 400;
      }
    }

    return needs;
  };

  const productionBuildings = aiProperties()
    .filter(tile => isProductionTerrain(tile.type) && !unitAt(simUnits, tile))
    .sort((a, b) => {
      const threatDiff = threatNear(b, isAirThreat, 9) - threatNear(a, isAirThreat, 9);
      if (threatDiff !== 0) return threatDiff;

      // Frontline production first: closer to valuable open properties.
      const bestTargetForA = openProperties
        .map(tile => strategicPathCost({ id: -1, side: "ai", commander: aiCommander, type: "infantry", x: a.x, y: a.y, hp: 10, acted: false }, a, tile))
        .sort((x, y) => x - y)[0] ?? Infinity;
      const bestTargetForB = openProperties
        .map(tile => strategicPathCost({ id: -2, side: "ai", commander: aiCommander, type: "infantry", x: b.x, y: b.y, hp: 10, acted: false }, b, tile))
        .sort((x, y) => x - y)[0] ?? Infinity;

      return bestTargetForA - bestTargetForB;
    });

  // Build from every open production building if there is a useful unit to buy.
  for (const building of productionBuildings) {
    const bestNeed = buildNeedsFor(building)
      .filter(need => simFunds.ai >= unitDefs[need.type].cost && canProduceUnit(building, need.type))
      .sort((a, b) => b.score - a.score)[0];

    if (!bestNeed || bestNeed.score <= 0) continue;

    simUnits.push({
      id: Date.now() + building.x * 100 + building.y,
      side: "ai",
      commander: aiCommander,
      type: bestNeed.type,
      x: building.x,
      y: building.y,
      hp: 10,
      acted: true,
    });

    simFunds.ai -= unitDefs[bestNeed.type].cost;

    await sync(`Red AI built ${unitDefs[bestNeed.type].name} for ${bestNeed.reason}.`, 450);
  }

  const reservedCaptureTargets = new Set<string>();

  const unitOrder = simUnits
    .filter(unit => unit.side === "ai" && !unit.acted)
    .sort((a, b) => {
      const aTile = tileAt(a);
      const bTile = tileAt(b);
      const aCanCaptureHere = !!aTile && canCapture(a) && isCapturableTerrain(aTile.type) && aTile.owner !== "ai";
      const bCanCaptureHere = !!bTile && canCapture(b) && isCapturableTerrain(bTile.type) && bTile.owner !== "ai";

      if (aCanCaptureHere !== bCanCaptureHere) return aCanCaptureHere ? -1 : 1;
      if (canCapture(a) !== canCapture(b)) return canCapture(a) ? -1 : 1;

      // Combat units with better mobility move earlier.
      return effectiveMove(b) - effectiveMove(a);
    })
    .map(unit => unit.id);

  for (const aiId of unitOrder) {
    let current = simUnits.find(unit => unit.id === aiId);
    if (!current || current.acted) continue;

    const currentTile = tileAt(current);

    if (currentTile && canCapture(current) && isCapturableTerrain(currentTile.type) && currentTile.owner !== "ai") {
      const stillCapturing = captureIfPossible(current, simTiles);
      simUnits = simUnits.map(unit => unit.id === current!.id ? { ...unit, acted: true, capturing: stillCapturing } : unit);
      await sync(`Red ${unitDefs[current.type].name} captures ${terrainDefs[currentTile.type].name}.`, 550);
      continue;
    }

    if (shouldRetreat(current)) {
      if (await retreatUnit(current)) continue;
    }

    if (canCapture(current)) {
      // Capture units are not helpless. They should interrupt player captures,
      // kill nearby units, or take a good trade before walking to another property.
      const currentAttack = bestCurrentAttack(current);
      if (
        currentAttack &&
        (
          isCaptureInterruptTarget(currentAttack.enemy) ||
          currentAttack.kills ||
          attackPriority(current, currentAttack) >= 1700
        )
      ) {
        await performAttack(current, currentAttack);
        continue;
      }

      const attackAfterMove = bestAttackAfterMove(current);
      if (
        attackAfterMove &&
        (
          isCaptureInterruptTarget(attackAfterMove.result.enemy) ||
          attackAfterMove.result.kills ||
          attackAfterMove.priority >= 2200
        )
      ) {
        current = await moveAIUnit(current, attackAfterMove.point, `Red ${unitDefs[current.type].name} moves to interrupt.`);
        await performAttack(current, attackAfterMove.result);
        continue;
      }

      const targetProperty = bestPropertyTargetFor(current, reservedCaptureTargets);

      if (targetProperty && canReachEventually(current, targetProperty)) {
        reservedCaptureTargets.add(key(targetProperty.x, targetProperty.y));

        const moveTarget = bestMoveToward(current, targetProperty, current.hp <= 3);
        current = await moveAIUnit(
          current,
          moveTarget,
          `Red ${unitDefs[current.type].name} moves toward ${propertyTargetReason(targetProperty)}.`
        );

        const landedTile = tileAt(current);

        if (landedTile && shouldCaptureLandedTile(current, landedTile, targetProperty)) {
          const stillCapturing = captureIfPossible(current, simTiles);
          simUnits = simUnits.map(unit => unit.id === current!.id ? { ...unit, acted: true, capturing: stillCapturing } : unit);
          await sync(`Red ${unitDefs[current.type].name} starts capturing ${terrainDefs[landedTile.type].name}.`, 550);
        } else {
          simUnits = simUnits.map(unit => unit.id === current!.id ? { ...unit, acted: true, capturing: false } : unit);
        }

        continue;
      }

      simUnits = simUnits.map(unit => unit.id === current!.id ? { ...unit, acted: true, capturing: false } : unit);
      continue;
    }

    const currentAttack = bestCurrentAttack(current);
    if (currentAttack) {
      await performAttack(current, currentAttack);
      continue;
    }

    const attackAfterMove = bestAttackAfterMove(current);
    if (attackAfterMove) {
      current = await moveAIUnit(current, attackAfterMove.point, `Red ${unitDefs[current.type].name} moves into attack position.`);
      await performAttack(current, attackAfterMove.result);
      continue;
    }

    // Combat units protect production/capturers first, then pressure valuable properties.
    const threatenedAiAsset = playerUnits()
      .filter(enemy => aiProperties().some(tile => dist(enemy, tile) <= 8))
      .sort((a, b) => turnsTo(current!, a) - turnsTo(current!, b))[0];

    const vulnerableCapturer = aiCapturers()
      .filter(unit => unit.id !== current!.id)
      .filter(unit => playerUnits().some(enemy => dist(enemy, unit) <= 7))
      .sort((a, b) => turnsTo(current!, a) - turnsTo(current!, b))[0];

    const valuableOpenProperty = openProperties
      .filter(tile => canReachEventually(current!, tile))
      .sort((a, b) => propertyBaseValue(b) - propertyBaseValue(a) || turnsTo(current!, a) - turnsTo(current!, b))[0];

    const playerHq = [...simTiles.values()].find(tile => tile.type === "hq" && tile.owner === "player");
    const supportTarget = threatenedAiAsset ?? vulnerableCapturer ?? valuableOpenProperty ?? playerHq;

    if (supportTarget) {
      const moveTarget = bestMoveToward(current, supportTarget, current.hp <= 4);
      current = await moveAIUnit(current, moveTarget, `Red ${unitDefs[current.type].name} supports the objective.`);
    }

    simUnits = simUnits.map(unit => unit.id === current!.id ? { ...unit, acted: true } : unit);
  }

  let playerTurnFunds = { player: funds.player + propertyIncome(simTiles, "player"), ai: simFunds.ai };
  const playerRepairs = repairUnitsForTurn(simUnits, simTiles, playerTurnFunds.player, "player");
  const playerTurnUnits = playerRepairs.units.map(unit => unit.side === "player" ? { ...unit, acted: false, moved: false } : unit);
  playerTurnFunds = { player: playerRepairs.funds, ai: simFunds.ai };

  const nextDay = day + 1;

  setUnits(playerTurnUnits);
  setTiles(simTiles);
  setFunds(playerTurnFunds);
  setDay(nextDay);
  setTurnSnapshot({
    tiles: new Map(simTiles),
    units: playerTurnUnits.map(unit => ({ ...unit })),
    funds: { ...playerTurnFunds },
    day: nextDay,
  });
  setTurn("player");
  setMovingUnitId(null);

  const playerRepairMessage = repairSummary("player", playerRepairs.totalHealed, playerRepairs.totalCost);
  setMessage(playerRepairMessage ? `${playerRepairMessage} Your turn.` : "Your turn. Select a unit, build ground units from factories, or build Copters from captured airports.");
}
