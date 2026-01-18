import { GameState } from "@/simulation/state/GameState.ts";

export interface DamageSnapshot {
  baseDamage: number;
  finalDamage: number;
  staggerDamage: number;
  isCrit: boolean;
  tags: string[];
  sourceId: string;
  targetId: string;
}

export type DamageModifier = (
  snapshot: DamageSnapshot,
  state: GameState
) => DamageSnapshot;

export class DamagePipeline {
  private modifiers: DamageModifier[] = [];

  addModifier(mod: DamageModifier) {
    this.modifiers.push(mod);
  }

  calculate(snapshot: DamageSnapshot, state: GameState): DamageSnapshot {
    return this.modifiers.reduce((current, mod) => {
      return mod(current, state);
    }, snapshot);
  }
}

// Stagger Pipeline (Merged or Separate)
// If Stagger is derivative of damage, it might be in DamagePipeline.
// But we might want separate modifiers for Stagger (e.g. +Stagger Dmg).
export class StaggerPipeline {
  // Similar structure
  calculate(damageResult: DamageSnapshot, state: GameState): number {
    // Apply stagger modifiers to damageResult.staggerDamage
    return damageResult.staggerDamage;
  }
}

// Example Stat Calculator (Framework)
export class StatCalculator {
  // Logic to compute dynamic stats from WorldState
  static getActorStats(actorId: string, state: GameState) {
    const actor = state.actors.get(actorId);
    if (!actor) return null;
    // Apply buffs to base stats...
    return actor.stats;
  }
}
