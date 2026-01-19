import type { BaseGameState } from "@/simulation/state/BaseGameState.ts";
import type { TeamSnapshot, TeamConfig } from "@/types/simulation.ts";

export class TeamState implements BaseGameState<TeamSnapshot> {
  private sp: number;
  private isSpRegenPaused: boolean = false;
  private spRegenPauseDuration: number = 0;

  constructor(readonly config: TeamConfig) {
    this.sp = config.initialSp || 0;
  }

  advanceTime(dt: number, currentTime: number) {
    this.regenSp(dt, currentTime);
  }

  snapshot(): TeamSnapshot {
    return {
      sp: this.sp,
      spRegenRate: this.config.spRegenRate,
      maxSp: this.config.maxSp,
      isSpRegenPaused: this.isSpRegenPaused,
      spRegenPauseDuration: this.spRegenPauseDuration,
    };
  }

  getSp(): number {
    return this.sp;
  }

  modifySp(amount: number): number {
    if (amount === 0) {
      return this.sp;
    }
    this.sp = this.sp + amount;
    return this.sp;
  }

  pauseSpRegen(duration: number) {
    this.isSpRegenPaused = true;
    this.spRegenPauseDuration += duration;
  }

  private regenSp(dt: number, currentTime: number) {
    if (this.sp >= this.config.maxSp) {
      return;
    }

    let effectiveDuration = dt;

    if (this.isSpRegenPaused) {
      if (dt < this.spRegenPauseDuration) {
        this.spRegenPauseDuration -= dt;
        return;
      }

      effectiveDuration -= this.spRegenPauseDuration;
      this.isSpRegenPaused = false;
      this.spRegenPauseDuration = 0;
    }

    if (this.sp < this.config.maxSp) {
      const gain = effectiveDuration * this.config.spRegenRate;
      this.modifySp(gain);
    }
  }
}
