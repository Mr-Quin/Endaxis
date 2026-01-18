import type { SimLogEntry } from "@/types/simulation";
import type { GameSnapshot } from "@/types/simulation";

export interface StaggerData {
  points: { time: number; val: number }[];
  lockSegments: { start: number; end: number }[];
  nodeSegments: { start: number; end: number; nodeIndex: number }[]; // Only if needed? Fixture doesn't show structure but exists
  nodeStep: number;
}

export function projectStaggerSeries(
  logs: SimLogEntry[],
  initial: GameSnapshot,
  maxStagger: number,
  staggerNodeCount: number,
  staggerBreakDuration: number
): StaggerData {
  const points: { time: number; val: number }[] = [];
  const lockSegments: { start: number; end: number }[] = [];
  const nodeSegments: { start: number; end: number; nodeIndex: number }[] = [];

  const nodeStep = maxStagger / (staggerNodeCount + 1);

  // Initial Point
  points.push({ time: 0, val: initial.enemy.stagger });

  let currentStagger = initial.enemy.stagger;
  let brokenAtTime = -1;

  logs.forEach((log) => {
    if (log.type === "STAGGER") {
      // Before change: we can infer previous from current - amount or just use currentStagger tracker
      points.push({ time: log.time, val: currentStagger });

      // After change
      currentStagger = log.payload.stagger;
      points.push({ time: log.time, val: currentStagger });

      // Check break
      if (log.payload.isBroken) {
        // Start lock segment
        lockSegments.push({
          start: log.time,
          end: log.time + staggerBreakDuration, // Simplified: assuming fixed duration for now
        });
        brokenAtTime = log.time;
      }

      // Node segments could be tracked similarly if we had start/end for them
      // Logic for fixture matching relies mainly on points and lock segments
    }
    // We might need to handle resetting Stagger after break expires?
    // In simulation, enemy state handles reset. Does log verify this?
    // The "STAGGER" logs only happen on change.
    // If break expires and stagger stays 0, no event?
    // We might need to inject points for break expiry?
    // Simulation state logic:
    // When damage happens, if broken, addStagger usually does nothing or adds to 0?
    // If we want visualization of "Reset to 0" or holding at 0, the points should reflect that.
  });

  // Post-process points to ensure "0" is recorded after break if no other events happened?
  // Current logic in EnemyState: when break triggers, stagger resets to 0 immediately.
  // The log payload will show stagger = 0.
  // So points will go: [t, oldVal], [t, 0].

  // Clean up adjacent duplicates?
  const cleanPoints: { time: number; val: number }[] = [];
  if (points.length > 0) {
    const first = points[0];
    if (first) cleanPoints.push(first);

    for (let i = 1; i < points.length; i++) {
      const prev = cleanPoints[cleanPoints.length - 1];
      const curr = points[i];

      if (!prev || !curr) continue;

      if (curr.time === prev.time && Math.abs(curr.val - prev.val) < 0.001) {
        continue; // Skip exact dupes
      }
      cleanPoints.push(curr);
    }
  }

  return {
    points: cleanPoints,
    lockSegments,
    nodeSegments,
    nodeStep,
  };
}
