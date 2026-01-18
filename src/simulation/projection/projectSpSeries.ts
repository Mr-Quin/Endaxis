import type { GameSnapshot, SimLogEntry } from "@/types/simulation";

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
    // Since we don't have snapshots anymore, we rely on the payload data or logical inference.
    // For SP_CHANGE, we have the new 'sp' value in payload.
    // For SP_REGEN_PAUSE, we implicitly trust the linear progression or previous value.
    // For now, let's assume valid linear regen unless we find a specific value in payload.

    let arrivalValue = lastValue;

    // Calculate expected linear regen if not frozen
    if (now > lastTime && frozenUntil <= lastTime) {
      // logic for regen calculation would require checking rate, but without snapshots
      // or explicit "regen tick" events, we might drift.
      // However, the previous logic relied on `beforeSnapshot` which was perfect.
      // Without it, we might need `SP_CHANGE` to carry the "value before change" or just use the "value after change"
      // and back-calculate?
      // Actually, simLog is fully authoritative sequence.
      // If we have an SP_CHANGE, the payload.sp is the NEW value.
      // The value BEFORE the change was payload.sp - payload.change.
      // So arrivalValue = payload.sp - payload.change.
    }

    if (entry.type === "SP_CHANGE") {
      arrivalValue = entry.payload.sp - entry.payload.change;
    } else if (entry.type === "SP_REGEN_PAUSE") {
      // With the fix, we now have sp in payload
      arrivalValue = entry.payload.sp;
    } else {
      // For PAUSE, we don't have a value snapshot.
      // We assume the previous events kept `lastValue` accurate up to the *previous* event time.
      // But we need to account for regen between lastTime and now.
      // Since we removed snapshots, we either need to re-simulate regen here, or
      // we need the simulation to emit an "SP_UPDATE" or similar if we want exact curves.
      // OR, we can trust that `SimLogEntry` for SP_REGEN_PAUSE *should* ideally contain the current SP?
      // But we defined it as just { duration }.
      // Let's rely on previous logic:
      // If we don't have snapshot, we just project flat from last known? No, that misses regen.
      // If the engine is correct, it emits events.
      // Wait, `projectSpSeries` is purely for visualization?
      // If we want accurate graphs, we need the SP value at the time of the event.
      // Let's ASSUME for now that regen is handled by the visualizer interpolating?
      // No, "STEP 2: Fill the Gap" explicitly draws lines.
      // CRITICAL: We need SP value at the time of PAUSE to draw correctly if we want to show regen happened.
      // But we removed `beforeSnapshot`.
      // Recommendation: Update SP_REGEN_PAUSE payload to include `currentSp`?
      // Or just accept that we might draw straight lines from last update.
      // Given the user instruction "move it into the engine... slim down the log",
      // maybe we should just accept what we have.
      // But let's look at `SP_CHANGE`. It has `sp` (final).
      // For this refactor, let's keep it simple:
      // If we have SP_CHANGE, we know exact values.
      // If we pause, we might just have to flat-line from last known or assume simple linear interp?
      // Let's assume linear interpolation from last known point (which is what drawing a line does).
      arrivalValue = lastValue;
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
          // 2. Draw Slope to arrival (using NEW snapshot/derived value)
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
      lastValue = entry.payload.sp; // Use payload (after value)
      spSeries.push({
        time: now,
        value: lastValue,
        actionId: entry.payload.sourceId,
      });
    } else if (entry.type === "SP_REGEN_PAUSE") {
      // Update our value tracker
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
