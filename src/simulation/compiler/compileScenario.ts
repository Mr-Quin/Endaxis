import { compileTimeline } from "./compileTimeline";
import type {
  ActionNode,
  ActorStats,
  CompiledScenario,
  GameDatabase,
  ScenarioData,
  ScenarioTrack,
  SystemConstants,
} from "./types";
import { createDefaultStats } from "@/utils/coreStats";
import type { ActorSnapshot } from "@/simulation/state/types.ts";

function normalizeTracks(tracks: ScenarioTrack[]): ScenarioTrack[] {
  return tracks.map((track) => {
    const baseStats = createDefaultStats() as ActorStats;
    track.stats = { ...baseStats, ...track.stats };

    return track;
  });
}

function processActors(tracks: ScenarioTrack[]): ActorSnapshot[] {
  return tracks
    .filter((t) => !!t.id)
    .map((track) => {
      return {
        id: track.id,
        stats: track.stats,
        resources: { hp: track.stats.hp, gauge: track.initialGauge },
        cooldowns: new Map(),
        activeBuffs: new Map(),
      };
    });
}

export function normalizeScenario(scenario: ScenarioData) {
  const tracks = normalizeTracks(scenario.tracks);

  const actions: ActionNode[] = [];
  tracks.forEach((track, index) => {
    track.actions.forEach((action) => {
      actions.push({
        type: "action",
        id: action.instanceId,
        trackIndex: index,
        trackId: track.id || `track_${index}`,
        node: action,
      });
    });
  });

  return {
    tracks,
    actions,
    actors: processActors(tracks),
  };
}

const DEFAULT_SYSTEM_CONSTANTS: SystemConstants = {
  maxSp: 300,
  initialSp: 200,
  spRegenRate: 8,
  skillSpCostDefault: 100,
  linkCdReduction: 0,
  maxStagger: 100,
  staggerNodeCount: 0,
  staggerNodeDuration: 2,
  staggerBreakDuration: 10,
  executionRecovery: 25,
};

export function compileScenario(
  scenario: ScenarioData,
  {
    systemConstants,
  }: {
    systemConstants?: Partial<SystemConstants>;
    db?: GameDatabase;
  } = {}
): CompiledScenario {
  const { actions, actors } = normalizeScenario(scenario);

  const compiledTimeline = compileTimeline(actions, scenario.connections);

  const mergedSystemConstants = {
    ...DEFAULT_SYSTEM_CONSTANTS,
    ...systemConstants,
    ...scenario.systemConstants,
  };

  return {
    timeline: compiledTimeline,
    actors,
    teamConfig: {
      maxSp: mergedSystemConstants.maxSp,
      initialSp: mergedSystemConstants.initialSp,
      spRegenRate: mergedSystemConstants.spRegenRate,
      skillSpCostDefault: mergedSystemConstants.skillSpCostDefault,
      linkCdReduction: mergedSystemConstants.linkCdReduction,
    },
    enemyConfig: {
      maxStagger: mergedSystemConstants.maxStagger,
      staggerNodeCount: mergedSystemConstants.staggerNodeCount,
      staggerNodeDuration: mergedSystemConstants.staggerNodeDuration,
      staggerBreakDuration: mergedSystemConstants.staggerBreakDuration,
      executionRecovery: mergedSystemConstants.executionRecovery,
    },
    systemConstants: mergedSystemConstants,
  };
}
