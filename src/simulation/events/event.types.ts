import type { ActionType, ResolvedDamageTick } from "../compiler/types";
import type { Effect, EffectSnapshot } from "../effects/Effect";

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
    actorId: string;
    actionId: string;
    damage: number;
    stagger: number;
    sp?: number;
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
    actorId: string;
    actionId?: string;
    targetId: string;
    effect: Effect;
  }
>;
export type EffectEndEvent = SimBaseEvent<
  "EFFECT_END",
  {
    effectInstanceId: string;
    type: "consumption" | "expiration";
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
        breakEndTime?: number;
        nodeReachedIndex?: number;
        nodeEndTime?: number;
      }
    >
  | SimLogEntryBase<
      "DAMAGE_TICK",
      {
        targetId: string;
        actorId: string;
        damage: number;
        stagger: number;
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
        effectSnapshot: EffectSnapshot;
        targetId: string;
      }
    >
  | SimLogEntryBase<
      "REACTION_OCCURRED",
      {
        reactionName: string;
        actorId: string;
      }
    >
  | SimLogEntryBase<
      "EFFECT_APPLIED",
      {
        name: string;
        tags: any[];
        targetId: string;
      }
    >
  | SimLogEntryBase<
      "EFFECT_END",
      {
        effectId: string;
        targetId: string;
        type: "consumption" | "expiration";
      }
    >;
