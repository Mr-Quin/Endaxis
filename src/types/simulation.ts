import type { ActorStats } from "@/simulation/compiler/types";
import type {
  ActionType,
  ResolvedEffect,
  ResolvedAction,
  ResolvedDamageTick,
} from "./timeline";
import { GameState } from "@/simulation/state/GameState.ts";

export interface ActorSnapshot {
  id: string;
  stats: ActorStats;
  resources: {
    hp: number;
    gauge: number;
  };
  cooldowns: Map<string, number>;
  activeBuffs: Map<string, ResolvedEffect>;
  activeAction?: ResolvedAction;
}

export interface TeamConfig {
  maxSp: number;
  initialSp: number;
  spRegenRate: number;
  skillSpCostDefault: number;
  linkCdReduction: number;
}

export interface TeamSnapshot {
  sp: number;
  spRegenRate: number;
  maxSp: number;
  isSpRegenPaused: boolean;
  spRegenPauseDuration: number;
}

export interface EnemyConfig {
  maxStagger: number;
  staggerNodeCount: number;
  staggerNodeDuration: number;
  staggerBreakDuration: number;
  executionRecovery: number;
}

export interface EnemySnapshot {
  stagger: number;
  isBroken: boolean;
  breakEndTime: number;
}

export interface GameConfig {
  team: TeamConfig;
  enemy: EnemyConfig;
}

export interface GameSnapshot {
  team: TeamSnapshot;
  enemy: EnemySnapshot;
}

export type SimEventType = SimEvent["type"];

type SimBaseEvent<Name extends string, Data = {}> = {
  // real time
  time: number;
  type: Name;
  payload: Data;
};

export type ActionStartEvent = SimBaseEvent<
  "ACTION_START",
  {
    skillId: string;
    actionId: string;
    spCost?: number;
    actorId: string;
    type: ActionType;
    freezeDuration?: number;
  }
>;

export type ActionEndEvent = SimBaseEvent<
  "ACTION_END",
  {
    skillId: string;
    actionId: string;
    spGain?: number;
    actorId: string;
    type: ActionType;
  }
>;

export type DamageTickEvent = SimBaseEvent<
  "DAMAGE_TICK",
  {
    targetId: string;
    sourceId: string;
    damage: number;
    stagger: number;
    tickData: ResolvedDamageTick;
    actionId: string;
  }
>;

export type SpChangeEvent = SimBaseEvent<
  "SP_CHANGE",
  {
    actorId: string;
    spChange: number;
    reason: string;
    sourceId: string;
    parent: SimEvent;
  }
>;

export type SpRegenPauseEvent = SimBaseEvent<
  "SP_REGEN_PAUSE",
  {
    sourceId: string;
    duration: number;
  }
>;

export type EffectStartEvent = SimBaseEvent<
  "EFFECT_START",
  {
    effectId: string;
    targetId: string;
    type: string;
  }
>;
export type EffectEndEvent = SimBaseEvent<
  "EFFECT_END",
  {
    effectId: string;
    targetId: string;
    type: string;
  }
>;

export type StaggerChangeEvent = SimBaseEvent<
  "STAGGER_CHANGE",
  {
    stagger: number;
    actorId: string;
    actionId: string;
    targetId: string;
  }
>;

export type SimEvent =
  | ActionStartEvent
  | ActionEndEvent
  | DamageTickEvent
  | SpChangeEvent
  | SpRegenPauseEvent
  | EffectStartEvent
  | EffectEndEvent
  | StaggerChangeEvent;

export type SimLogEntryBase<Name extends string, Data = {}> = {
  type: Name;
  time: number;
  payload: Data;
};

export type SimLogEntry =
  | SimLogEntryBase<
      "SP_REGEN_PAUSE",
      {
        sourceId: string;
        duration: number;
        sp: number;
      }
    >
  | SimLogEntryBase<
      "SP_CHANGE",
      {
        sp: number;
        change: number;
        sourceId: string;
        reason: string;
      }
    >
  | SimLogEntryBase<
      "STAGGER",
      {
        actorId: string;
        actionId: string;
        amount: number;
        stagger: number;
        isBroken: boolean;
        nodeReachedIndex?: number;
      }
    >
  | SimLogEntryBase<
      "DAMAGE_TICK",
      {
        targetId: string;
        sourceId: string;
        damage: number;
        stagger: number;
        tickData: ResolvedDamageTick;
        actionId: string;
      }
    >
  | SimLogEntryBase<
      "ACTION_START",
      {
        skillId: string;
        actionId: string;
        type: ActionType;
        spCost?: number;
      }
    >
  | SimLogEntryBase<
      "ACTION_END",
      {
        skillId: string;
        actionId: string;
        type: ActionType;
        spGain?: number;
      }
    >
  | SimLogEntryBase<
      "EFFECT_START",
      {
        effectId: string;
        targetId: string;
        type: string;
      }
    >
  | SimLogEntryBase<
      "EFFECT_END",
      {
        effectId: string;
        targetId: string;
        type: string;
      }
    >;

export interface SimulationContext {
  state: GameState;
  queue: {
    enqueue: (event: SimEvent) => void;
  };
  simLog: (entry: SimLogEntry) => void;
  getAction: (id: string) => ResolvedAction | undefined;
}

export interface EventHookContext extends SimulationContext {
  beforeSnapshot: GameSnapshot;
  afterSnapshot: GameSnapshot;
}
