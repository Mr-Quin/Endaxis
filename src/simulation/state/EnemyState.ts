import type { BaseGameState } from "@/simulation/state/BaseGameState.ts";
import type { EnemySnapshot, EnemyStateConfig } from "@/types/simulation.ts";

export class EnemyState implements BaseGameState<EnemySnapshot> {
  private stagger: number = 0;

  isLocked: boolean = false;
  lockEndTime: number = 0;

  constructor(readonly config: EnemyStateConfig) {}

  addStagger(
    amount: number,
    currentTime: number
  ): { broken: boolean; breakEnd?: number } {
    if (amount <= 0) {
      return { broken: false };
    }

    if (this.isLocked) {
      if (currentTime < this.lockEndTime) {
        return { broken: false };
      } else {
        this.isLocked = false;
      }
    }

    this.stagger = Math.max(0, this.stagger + amount);

    if (this.stagger >= this.config.maxStagger) {
      this.stagger = 0;
      this.isLocked = true;
      const breakDuration = this.config.staggerBreakDuration;
      this.lockEndTime = currentTime + breakDuration;
      return { broken: true, breakEnd: this.lockEndTime };
    }

    return { broken: false };
  }

  getStagger() {
    return this.stagger;
  }

  advanceTime(dt: number, currentTime: number) {
    if (this.isLocked && this.lockEndTime < currentTime) {
      this.isLocked = false;
    }
  }

  snapshot(): EnemySnapshot {
    return {
      stagger: this.stagger,
      isLocked: this.isLocked,
      lockEndTime: this.lockEndTime,
    };
  }
}
