import { describe, it, expect } from "vitest";
import { TimeContext } from "./time-context";
import { timeExtensions } from "./timeExtension.fixture";

describe("TimeContext", () => {
  const ctx = new TimeContext([...timeExtensions]);

  describe("toGameTime", () => {
    it("should return same time if before any freezes", () => {
      // First freeze at 2.5
      expect(ctx.toGameTime(1.0)).toBe(1.0);
      expect(ctx.toGameTime(2.4)).toBe(2.4);
    });

    it("should return freeze start time during a freeze window", () => {
      // Freeze 1: time=2.5, amount=0.5 -> real range [2.5, 3.0)
      // Note: cumulativeFreezeTime=0 here
      expect(ctx.toGameTime(2.5)).toBe(2.5);
      expect(ctx.toGameTime(2.7)).toBe(2.5);
      expect(ctx.toGameTime(2.99)).toBe(2.5);
    });

    it("should return shifted time after one freeze", () => {
      // Freeze 1 ends at 3.0 real time.
      // At real 3.0, game time should be 2.5? Wait.
      // gameTime = realTime - cumulative.
      // cumulative after freeze 1 is 0.5.
      // So real 3.0 -> game 2.5?
      // Let's check logic: if realTime < nextFreezeStart.
      // Next freeze starts at 5.6 real logicalTime... wait fixture says time=5.6
      // Let's look at fixture entry 2:
      // time: 5.6 (real start), gameTime: 5.1, amount: 0.5, cumulative: 0.5
      // So between 3.0 and 5.6 real time.
      // at 3.0 real: 3.0 - 0.5 = 2.5 game. Correct.
      expect(ctx.toGameTime(3.0)).toBe(2.5);
      expect(ctx.toGameTime(4.0)).toBe(3.5);
    });

    it("should handle multiple freezes correctly", () => {
      // After second freeze (5.6 + 0.5 = 6.1 real end)
      // Cumulative is now 0.5 + 0.5 = 1.0
      expect(ctx.toGameTime(6.1)).toBe(5.1);
      expect(ctx.toGameTime(7.0)).toBe(6.0);
    });

    it("should handle late timeline values", () => {
      // Last freeze: time 27.2 (real), amount 0.5, cumulative 4.5
      // Real End = 27.2 + 0.5 = 27.7
      // Total cumulative after = 5.0
      expect(ctx.toGameTime(30.0)).toBe(25.0);
    });
  });

  describe("toRealTime", () => {
    it("should return same time if before any freezes", () => {
      expect(ctx.toRealTime(1.0)).toBe(1.0);
    });

    it("should return exact start time at freeze start", () => {
      // Freeze 1 at game 2.5
      expect(ctx.toRealTime(2.5)).toBe(2.5);
      // Based on logic: gameTime === breakPoint.gameTime -> return gameTime + cumulative
      // 2.5 + 0 = 2.5. Correct.
    });

    it("should return time AFTER freeze immediately after freeze start", () => {
      // Just after 2.5 game time, say 2.51
      // Should include the 0.5 freeze amount.
      // 2.51 + 0 + 0.5 = 3.01
      expect(ctx.toRealTime(2.51)).toBeCloseTo(3.01);
    });

    it("should accumulate multiple freezes", () => {
      // Game time 6.0
      // Past freeze 1 (0.5) and freeze 2 (0.5). Total 1.0.
      // 6.0 + 1.0 = 7.0
      expect(ctx.toRealTime(6.0)).toBe(7.0);
    });
  });

  describe("getShiftedEndTime", () => {
    it("should return simple duration if no overlaps", () => {
      // Start at 0, duration 1. No freezes.
      expect(ctx.getShiftedEndTime(0, 1)).toBe(1);
    });

    it("should extend duration if overlapping a freeze", () => {
      // Start at 2.0, duration 1.0. End normally 3.0.
      // Overlaps freeze at 2.5 (length 0.5).
      // Should extend to 3.5.
      expect(ctx.getShiftedEndTime(2.0, 1.0)).toBe(3.5);
    });

    it("should extend for multiple freezes", () => {
      // Start 2.0. Duration 10.0. Normal End 12.0.
      // Freezes in range 0-12 real time:
      // 1. 2.5 (0.5) -> pushed to 12.5
      // 2. 5.6 (0.5) -> pushed to 13.0
      // 3. 10.0 (0.5) -> pushed to 13.5
      // Any new freezes exposed?
      // Range is now [2.0, 13.5].
      // freeze 4 is at 17.8. Not included.
      expect(ctx.getShiftedEndTime(2.0, 10.0)).toBe(13.5);
    });

    it("should exclude specific source ID", () => {
      // Start 2.0, duration 1.0. Cover freeze at 2.5 (id: inst_9fi6580).
      // If we exclude it, result should be 3.0 (no extension).
      expect(ctx.getShiftedEndTime(2.0, 1.0, "inst_9fi6580")).toBe(3.0);
    });
  });
});
