import type { BaseGameState } from "@/simulation/state/BaseGameState.ts";
import type { TeamSnapshot, TeamStateConfig } from "@/types/simulation.ts";

export class TeamState implements BaseGameState<TeamSnapshot> {
  sp: number;
  gauge: number;
  private isSpRegenPaused: boolean = false;
  private spRegenPauseDuration: number = 0;

  constructor(readonly config: TeamStateConfig) {
    this.sp = config.initialSp || 0;
    this.gauge = 0;
  }

  advanceTime(dt: number, currentTime: number) {
    this.regenSp(dt, currentTime);
  }

  snapshot(): TeamSnapshot {
    return {
      sp: this.sp,
      gauge: this.gauge,
      isSpRegenPaused: this.isSpRegenPaused,
      spRegenPauseDuration: this.spRegenPauseDuration,
    };
  }

  modifySp(amount: number): number {
    if (amount === 0) {
      return this.sp;
    }
    this.sp = Math.min(Math.max(0, this.sp + amount), this.config.maxSp);
    return this.sp;
  }

  pauseSpRegen(duration: number) {
    this.isSpRegenPaused = true;
    this.spRegenPauseDuration += duration;
  }

  private regenSp(dt: number, currentTime: number) {
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
