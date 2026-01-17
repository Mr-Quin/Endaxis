import { TimeExtension } from "../types/timeline";

function round(num: number, factor: number = 1000): number {
  return Math.round(num * factor) / factor;
}

export class TimeContext {
  constructor(private readonly extensions: TimeExtension[]) {}

  /**
   * Converts Physical Time (Real Time) to Logical Time (Game Time).
   * Removing the duration of freezes that happened before this moment.
   */
  toGameTime(realTime: number): number {
    for (const ext of this.extensions) {
      const freezeRealStart = ext.gameTime + ext.cumulativeFreezeTime;
      const freezeRealEnd = freezeRealStart + ext.amount;

      // If we are INSIDE a freeze window, the game time is frozen at the start of the freeze
      if (realTime >= freezeRealStart && realTime < freezeRealEnd) {
        return ext.gameTime;
      }

      // If we are BEFORE this freeze started (but after previous ones processed)
      // Actually, since we iterate in order, if we haven't hit the "inside" check above,
      // we check if we are *before* this freeze start.
      if (realTime < freezeRealStart) {
        return realTime - ext.cumulativeFreezeTime;
      }
    }

    // If we passed all extensions
    const last = this.extensions[this.extensions.length - 1];
    if (last) {
      const totalOffset = last.cumulativeFreezeTime + last.amount;
      return realTime - totalOffset;
    }

    return realTime;
  }

  /**
   * Converts Logical Time (Game Time) to Physical Time (Real Time).
   * Adding the duration of freezes that happened before this moment.
   */
  toRealTime(gameTime: number): number {
    // Find the latest freeze that started <= gameTime
    // We search reversed to find the *last* freeze that occurred at or before this game time.
    // NOTE: If gameTime exactly matches a freeze start time, typically that freeze *has* happened.
    const reversedExtensions = [...this.extensions].reverse();
    const breakPoint = reversedExtensions.find((e) => e.gameTime <= gameTime);

    if (!breakPoint) return gameTime;

    // If we are exactly at the start of a freeze, we technically are "at" the freeze start time physically.
    // However, usually we want the time *after* the freeze if we are talking about "when does this action finish?"
    // strict <= check usually means we include the freeze.

    // Logic from store:
    // if (gameTimeS === breakPoint.gameTime) { return gameTimeS + breakPoint.cumulativeFreezeTime; }
    // return gameTimeS + breakPoint.cumulativeFreezeTime + breakPoint.amount;

    // Wait, the store logic says if equals, we DON'T add the amount?
    // "if (gameTimeS === breakPoint.gameTime) { return gameTimeS + breakPoint.cumulativeFreezeTime; }"
    // This implies that at the *exact moment* a freeze starts, the real time is just before the freeze duration is added?
    // Let's stick to the store logic for parity, but verify with tests.

    if (gameTime === breakPoint.gameTime) {
      return gameTime + breakPoint.cumulativeFreezeTime;
    }

    return gameTime + breakPoint.cumulativeFreezeTime + breakPoint.amount;
  }

  /**
   * Calculates the shifted end time given a starting physical time and duration.
   * Extends duration if it overlaps with any freeze windows.
   */
  getShiftedEndTime(
    startTime: number,
    duration: number,
    excludeActionId: string | null = null
  ): number {
    let currentTimeLimit = startTime + duration;
    const processedExtensions = new Set<string>();
    let changed = true;

    while (changed) {
      changed = false;
      for (const ext of this.extensions) {
        if (ext.sourceId === excludeActionId) continue;
        if (processedExtensions.has(ext.sourceId)) continue;

        if (ext.time >= startTime && ext.time < currentTimeLimit) {
          currentTimeLimit = round(currentTimeLimit + ext.amount);
          processedExtensions.add(ext.sourceId);
          changed = true;
        }
      }
    }
    return currentTimeLimit;
  }
}
