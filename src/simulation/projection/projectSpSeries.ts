import type { GameSnapshot, SimLogEntry } from "@/types/simulation";
import type { ResolvedTimeline } from "@/types/timeline";
import type { PriorityQueue } from "../engine";

export function projectSpSeries(
  simLog: SimLogEntry[],
  initialSnapshot: GameSnapshot
) {
  const spSeries: { time: number; value: number; actionId?: string }[] = [];

  // State
  let lastTime = 0;
  let lastValue = initialSnapshot.team.sp;
  let frozenUntil = 0;

  // Initial Point
  spSeries.push({ time: 0, value: lastValue });

  for (let i = 0; i < simLog.length; i++) {
    const entry = simLog[i];

    if (
      !entry ||
      (entry.type !== "SP_REGEN_PAUSE" && entry.type !== "SP_CHANGE")
    ) {
      continue;
    }

    const now = entry.time;

    // --- STEP 1: Determine Truth at Arrival ---
    // The simulation already calculated the exact SP at this moment. Use it.
    // This fixes the T=6.2 issue where we ignored the 161.6 regen because the event was a PAUSE.
    let arrivalValue = entry.beforeSnapshot?.team?.sp;

    // Fallback logic if snapshot is missing (for safety)
    if (arrivalValue === undefined) {
      if (entry.type === "SP_CHANGE") {
        arrivalValue = entry.payload.sp - entry.payload.change;
      } else {
        arrivalValue = lastValue;
      }
    }

    // Clamp arrival value
    arrivalValue = Math.max(0, arrivalValue);

    // --- STEP 2: Fill the Gap (Draw Lines) ---
    // Connect lastTime -> now

    if (now > lastTime) {
      // CASE A: Gap contains a freeze (Partial or Full)
      if (frozenUntil > lastTime) {
        // Sub-case 1: Freeze ended "mid-air" (Thaw happened)
        if (frozenUntil < now) {
          // 1. Draw Flat line to end of freeze (using OLD value)
          spSeries.push({ time: frozenUntil, value: lastValue });
          // 2. Draw Slope to arrival (using NEW snapshot value)
          // This represents the regen that happened from Thaw -> Now
          spSeries.push({ time: now, value: arrivalValue });
        }

        // Sub-case 2: Still frozen (or freeze ends exactly now)
        else {
          // Draw Flat line to now
          spSeries.push({ time: now, value: lastValue });
          // Force arrival value to match last value to maintain flat line visual
          arrivalValue = lastValue;
        }
      }
      // CASE B: Pure Regen Gap
      else {
        // Just draw the line to the snapshot value
        spSeries.push({ time: now, value: arrivalValue });
      }
    }

    // --- STEP 3: Process the Event ---

    if (entry.type === "SP_CHANGE") {
      // Discrete Jump
      lastValue = entry.payload.sp; // Use payload (or afterSnapshot)
      spSeries.push({
        time: now,
        value: lastValue,
        actionId: entry.payload.sourceId,
      });
    } else if (entry.type === "SP_REGEN_PAUSE") {
      // Update our value tracker to match the snapshot (syncing up)
      lastValue = arrivalValue;

      const newFreezeEnd = now + entry.payload.duration;
      frozenUntil = Math.max(frozenUntil, newFreezeEnd);

      // LOOKAHEAD: Fast Forward flat line
      // Check if next event is strictly after the freeze ends
      let nextEventTime = Infinity;
      for (let j = i + 1; j < simLog.length; j++) {
        const nextEntry = simLog[j];
        if (!nextEntry) {
          break;
        }
        if (
          nextEntry.type === "SP_CHANGE" ||
          nextEntry.type === "SP_REGEN_PAUSE"
        ) {
          nextEventTime = nextEntry.time;
          break;
        }
      }

      if (nextEventTime > newFreezeEnd) {
        // Draw the flat line corner immediately
        spSeries.push({ time: newFreezeEnd, value: lastValue });
        // Do NOT update lastTime here, let the next loop handle the gap logic
        lastTime = Math.max(lastTime, newFreezeEnd);
      }
    }

    lastTime = Math.max(lastTime, now);
  }

  // Final Cleanup
  if (frozenUntil > lastTime) {
    spSeries.push({ time: frozenUntil, value: lastValue });
  }

  return spSeries;
}
