/**
 * Monotonic risk computation: effective risk is the maximum of the declared
 * risk and every contributing dimension. Risk can be raised, never lowered.
 */

const ORDER = ["R0", "R1", "R2", "R3"];

function assertRisk(value) {
  if (!ORDER.includes(value)) {
    throw new TypeError(`unknown risk level: ${String(value)}`);
  }
  return value;
}

export function compareRisk(left, right) {
  return ORDER.indexOf(assertRisk(left)) - ORDER.indexOf(assertRisk(right));
}

export function maxRisk(levels) {
  let result = "R0";
  for (const level of levels) {
    if (compareRisk(assertRisk(level), result) > 0) {
      result = level;
    }
  }
  return result;
}

/**
 * dimensions: { [name]: { risk, reason } }. Every dimension above R0 must
 * carry a non-empty reason — an unexplained escalation is unauditable, and
 * an unexplained non-escalation is unreviewable.
 */
export function computeEffectiveRisk({ declared, dimensions = {} }) {
  assertRisk(declared);
  const reasons = [];
  const levels = [declared];
  for (const [name, entry] of Object.entries(dimensions)) {
    assertRisk(entry.risk);
    if (typeof entry.reason !== "string" || !entry.reason.trim()) {
      throw new TypeError(`risk dimension ${name} requires a reason`);
    }
    levels.push(entry.risk);
    if (compareRisk(entry.risk, "R0") > 0) {
      reasons.push(`${name}: ${entry.reason} (${entry.risk})`);
    }
  }
  const risk = maxRisk(levels);
  if (compareRisk(risk, "R0") > 0 && reasons.length === 0) {
    reasons.push(`declared: requester declared ${declared} (${declared})`);
  }
  return { risk, reasons };
}
