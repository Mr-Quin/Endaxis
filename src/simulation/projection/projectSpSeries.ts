import type { GameSnapshot, SimLogEntry } from "@/types/simulation";

export function projectSpSeries(
  simLog: SimLogEntry[],
  initialSnapshot: GameSnapshot
) {
  const spSeries: { time: number; value: number; actionId?: string }[] = [];

  let lastTime = 0;
  let lastValue = initialSnapshot.team.sp;
  let frozenUntil = 0;

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

    let arrivalValue = lastValue;

    if (entry.type === "SP_CHANGE") {
      arrivalValue = entry.payload.sp - entry.payload.change;
    } else if (entry.type === "SP_REGEN_PAUSE") {
      arrivalValue = entry.payload.sp;
    } else {
      arrivalValue = lastValue;
    }

    arrivalValue = Math.max(0, arrivalValue);

    if (now > lastTime) {
      if (frozenUntil > lastTime) {
        if (frozenUntil < now) {
          spSeries.push({ time: frozenUntil, value: lastValue });
          spSeries.push({ time: now, value: arrivalValue });
        } else {
          spSeries.push({ time: now, value: lastValue });
          arrivalValue = lastValue;
        }
      } else {
        spSeries.push({ time: now, value: arrivalValue });
      }
    }

    if (entry.type === "SP_CHANGE") {
      lastValue = entry.payload.sp;
      spSeries.push({
        time: now,
        value: lastValue,
        actionId: entry.payload.sourceId,
      });
    } else if (entry.type === "SP_REGEN_PAUSE") {
      lastValue = arrivalValue;

      const newFreezeEnd = now + entry.payload.duration;
      frozenUntil = Math.max(frozenUntil, newFreezeEnd);

      // lookahead
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
        spSeries.push({ time: newFreezeEnd, value: lastValue });
        lastTime = Math.max(lastTime, newFreezeEnd);
      }
    }

    lastTime = Math.max(lastTime, now);
  }

  if (frozenUntil > lastTime) {
    spSeries.push({ time: frozenUntil, value: lastValue });
  }

  return spSeries;
}
