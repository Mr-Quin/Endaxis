import { GameState } from "@/simulation/state/GameState.ts";
import type { ResolvedAction, ResolvedDamageTick } from "@/types/timeline.ts";

export interface DamageSnapshot {
  baseDamage: number;
  finalDamage: number;
  staggerDamage: number;
  isCrit: boolean;
  tags: string[];
  sourceId: string;
  targetId: string;
  action?: ResolvedAction;
  tick?: ResolvedDamageTick;
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

// Stagger Pipeline
export interface StaggerSnapshot {
  baseStagger: number;
  finalStagger: number;
  sourceId: string;
  targetId: string;
  boundEffects?: string[];
}

export class StaggerPipeline {
  calculate(snapshot: StaggerSnapshot, state: GameState): number {
    let stagger = snapshot.baseStagger;
    if (stagger <= 0) return 0;

    // 1. Arts Power Bonus for Knockup/Knockdown
    if (snapshot.boundEffects) {
      const boundEffects = snapshot.boundEffects;
      const hasKnockBinding = boundEffects.some((id) => {
        // Look up in registry if active check fails (handled by state.enemy.getEffectType logic)
        const type = state.enemy.getEffectType(id);
        return type === "knockup" || type === "knockdown";
      });

      if (hasKnockBinding) {
        const actor = state.actors.get(snapshot.sourceId);
        const originiumArtsPower = actor?.stats?.originiumArtsPower || 0;
        const ORIGINIUM_ARTS_FACTOR = 0.005;
        const multiplier = 1 + originiumArtsPower * ORIGINIUM_ARTS_FACTOR;
        stagger *= multiplier;
      }
    }

    return Math.round(stagger * 1000) / 1000;
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
