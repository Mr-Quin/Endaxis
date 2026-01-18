import type { SimLogEntry } from "@/types/simulation";
import type { ResolvedTimeline } from "@/types/timeline";

export function projectSpSeries(
  simLog: SimLogEntry[],
  timeline: ResolvedTimeline
) {
  const spSeries: { x: number; y: number; actionId?: string }[] = [];

  // Map<GameTime, Duration>
  const freezeMap = new Map<number, number>();
  timeline.actions.forEach((a) => {
    if (a.freezeDuration && a.freezeDuration > 0)
      freezeMap.set(a.startTime, a.freezeDuration);
  });

  let cumulativeRealTimeOffset = 0;

  for (const entry of simLog) {
    // A. Calculate Real Time X-Axis
    const gameTime = entry.time;
    const realTimeStart = gameTime + cumulativeRealTimeOffset;

    // B. Handle Freeze Gaps
    const freezeDuration = freezeMap.get(gameTime) || 0;

    // If there is a freeze, we might need to draw a "flat line" segment
    if (freezeDuration > 0) {
      // 1. Plot current value at start of freeze
      if (entry.type === "SP_ANCHOR" || entry.type === "SP_CHANGE") {
        spSeries.push({ x: realTimeStart, y: entry.payload.sp });
      }

      // 2. Advance Real Time (The Gap)
      cumulativeRealTimeOffset += freezeDuration;

      // 3. Plot same value at end of freeze (Flat line)
      if (entry.type === "SP_ANCHOR" || entry.type === "SP_CHANGE") {
        spSeries.push({
          x: realTimeStart + freezeDuration,
          y: entry.payload.sp,
        });
      }
    } else {
      // Normal Point
      if (entry.type === "SP_ANCHOR" || entry.type === "SP_CHANGE") {
        const sourceId =
          entry.type === "SP_CHANGE" ? entry.payload.sourceId : undefined;

        spSeries.push({
          x: realTimeStart,
          y: entry.payload.sp,
          actionId: sourceId,
        });
      }
    }
  }

  return spSeries;
}
