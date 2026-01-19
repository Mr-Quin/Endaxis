import type {
  ActorSnapshot,
  EnemyConfig,
  TeamConfig,
} from "@/types/simulation";
import type { Action, ResolvedTimeline } from "@/types/timeline";

export interface ScenarioData {
  tracks: ScenarioTrack[];
  connections?: Connection[];

  // config
  systemConstants?: SystemConstants;
  characterOverrides?: Record<string, any>;
  weaponOverrides?: Record<string, any>;
  equipmentCategoryOverrides?: Record<string, any>;
  weaponStatuses?: any[];

  // enemy
  activeEnemyId?: string;
  customEnemyParams?: Partial<EnemyConfig>;

  switchEvents?: SwitchEvent[];

  // others
  [key: string]: any;
}

export type SystemConstants = EnemyConfig & TeamConfig;

export interface SwitchEvent {
  // TOOD
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  fromEffectId?: string | null;
  fromEffectIndex?: number | null;
  toEffectId?: string | null;
  toEffectIndex?: number | null;
  isConsumption?: boolean;
  consumptionOffset?: number;
  targetPort?: string;
  sourcePort?: string;
}

export type ActorStats = {
  primary_ability: number;
  secondary_ability: number;
  strength: number;
  agility: number;
  intellect: number;
  will: number;
  attack: number;
  hp: number;
  crit_rate: number;
  blaze_dmg: number;
  emag_dmg: number;
  cold_dmg: number;
  nature_dmg: number;
  healing_effect: number;
  physical_dmg: number;
  arts_dmg: number;
  originium_arts_power: number;
  ult_charge_eff: number;
  link_cd_reduction: number;
};

export type ActorStatKeys = keyof ActorStats;

export interface ScenarioTrack {
  // 角色名
  id: string;
  actions: Action[];

  // stats
  stats: ActorStats;
  /**
   * @deprecated - use stats.ult_charge_eff
   */
  gaugeEfficiency: number;
  /**
   * @deprecated - use stats.originium_arts_power
   */
  originiumArtsPower: number;
  /**
   * @deprecated - use stats.link_cd_reduction
   */
  linkCdReduction: number;

  // config
  initialGauge: number;
  maxGaugeOverride?: number | null;

  // equipment
  weaponId?: string | null;
  weaponCommon1Tier?: number;
  weaponCommon2Tier?: number;
  weaponBuffTier?: number;
  weaponAppliedDeltas?: Record<string, any>;
  equipArmorId?: string | null;
  equipGlovesId?: string | null;
  equipAccessory1Id?: string | null;
  equipAccessory2Id?: string | null;
}

export interface GameDatabase {
  // TODO
  weapons?: any[];
}

export interface CompiledScenario {
  timeline: ResolvedTimeline;
  actors: ActorSnapshot[];
  teamConfig: TeamConfig;
  enemyConfig: EnemyConfig;
  systemConstants: SystemConstants;
}
