import type { SimulationContext } from "../engine/SimulationContext";
import type {
  SimEntityId,
  SimEvent,
  SimEventType,
} from "../events/event.types";

export type ElementalEffectTag =
  // 法术
  | "ELEMENT_CRYO" // 寒冷
  | "ELEMENT_HEAT" // 灼热
  | "ELEMENT_ELECTRIC" // 电磁
  | "ELEMENT_NATURE" // 自然
  // 法术异常
  | "ELEMENT_COMBUSTION" // 燃烧
  | "ELEMENT_ELECTRIFICATION" // 导电
  | "ELEMENT_SOLIDIFICATION" // 冻结
  | "ELEMENT_CORROSION" // 腐蚀
  // 法术爆发
  | "ELEMENT_CRYO_BURST" // 寒冷爆发
  | "ELEMENT_HEAT_BURST" // 灼热爆发
  | "ELEMENT_ELECTRIC_BURST" // 电磁爆发
  | "ELEMENT_NATURE_BURST"; // 自然爆发

export type PhysicalEffectTag =
  // 物理异常
  | "PHYSICAL_VULNERABLE" // 破防
  // 物理异常2
  | "PHYSICAL_KNOCK_DOWN" // 倒地
  | "PHYSICAL_LIFT" // 击飞
  | "PHYSICAL_CRUSH" // 猛击
  | "PHYSICAL_BREACH"; // 碎甲

export type EffectTag =
  | ElementalEffectTag
  | PhysicalEffectTag;

export interface EffectTrigger<T extends SimEventType = SimEventType> {
  event: T;
  ownerId?: string;

  cooldownId?: string;
  cooldownDuration?: number;

  once?: boolean;

  sourceCondition?: "self";
  condition?: (
    event: Extract<SimEvent, { type: T }>,
    ctx: SimulationContext,
    inst: EffectInstance,
  ) => boolean;

  action: (
    event: Extract<SimEvent, { type: T }>,
    ctx: SimulationContext,
    inst: EffectInstance,
  ) => void;
}

export function createEffectTrigger<T extends SimEventType>(
  trigger: EffectTrigger<T>,
): EffectTrigger<T> {
  return trigger;
}

export type StackStrategy = "REFRESH_DURATION" | "INDEPENDENT" | "ADD_DURATION";

export interface EffectSnapshot {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  tags: EffectTag[];
  duration: number;
  startTime: number;
  maxStacks: number;
  stackStrategy: StackStrategy;
  currentStacks: number;
  properties: {
    value?: number;
    [key: string]: any;
  };
}

export type AnyEffectTrigger = {
  [K in SimEventType]: EffectTrigger<K>;
}[SimEventType];

export class EffectDefinition {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly type: string;

  readonly tags: EffectTag[];

  readonly duration: number;
  readonly maxStacks: number = 1;
  readonly stackStrategy: StackStrategy = "INDEPENDENT";

  readonly properties: {
    value?: number;
    [key: string]: any;
  };

  readonly triggers: AnyEffectTrigger[];

  constructor(
    data: Partial<EffectSnapshot> & {
      id: string;
      tags: EffectTag[];
      triggers?: AnyEffectTrigger[];
    },
  ) {
    this.id = data.id;
    this.name = data.name || "";
    this.description = data.description || "";
    this.type = data.type || "UNKNOWN";
    this.tags = data.tags;
    this.duration = data.duration ?? Infinity;
    this.maxStacks = data.maxStacks || 1;
    this.stackStrategy = data.stackStrategy || "REFRESH_DURATION";
    this.properties = data.properties || {};
    this.triggers = data.triggers || [];
  }

  clone() {
    return new EffectDefinition({
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      tags: this.tags,
      duration: this.duration,
      maxStacks: this.maxStacks,
      stackStrategy: this.stackStrategy,
      properties: this.properties,
      triggers: this.triggers,
    });
  }

  static PhysicalVulnerable() {
    return new EffectDefinition({
      id: "PHYSICAL_VULNERABLE",
      tags: ["PHYSICAL_VULNERABLE"],
      name: "Physical Affliction",
      duration: Number.POSITIVE_INFINITY,
      stackStrategy: "REFRESH_DURATION",
      maxStacks: 4,
    });
  }

  static PhysicalKnockDown() {
    return new EffectDefinition({
      id: "PHYSICAL_KNOCK_DOWN",
      tags: ["PHYSICAL_KNOCK_DOWN"],
      name: "Physical Affliction",
      duration: Number.POSITIVE_INFINITY,
      stackStrategy: "REFRESH_DURATION",
      maxStacks: 4,
    });
  }

  static PhysicalLift() {
    return new EffectDefinition({
      id: "PHYSICAL_LIFT",
      tags: ["PHYSICAL_LIFT"],
      name: "Physical Affliction",
      duration: Number.POSITIVE_INFINITY,
      stackStrategy: "REFRESH_DURATION",
      maxStacks: 4,
    });
  }

  static PhysicalBreach() {
    return new EffectDefinition({
      id: "PHYSICAL_BREACH",
      tags: ["PHYSICAL_BREACH"],
      name: "Physical Affliction",
      duration: Number.POSITIVE_INFINITY,
      stackStrategy: "REFRESH_DURATION",
      maxStacks: 4,
    });
  }

  static PhysicalCrush() {
    return new EffectDefinition({
      id: "PHYSICAL_CRUSH",
      tags: ["PHYSICAL_CRUSH"],
      name: "Physical Affliction",
      duration: Number.POSITIVE_INFINITY,
      stackStrategy: "REFRESH_DURATION",
      maxStacks: 4,
    });
  }

  static ElementCryo() {
    return new EffectDefinition({
      id: "ELEMENT_CRYO",
      tags: ["ELEMENT_CRYO"],
      name: "Cryo Afflication",
      duration: Number.POSITIVE_INFINITY,
      stackStrategy: "REFRESH_DURATION",
      maxStacks: 4,
    });
  }

  static ElementHeat() {
    return new EffectDefinition({
      id: "ELEMENT_HEAT",
      tags: ["ELEMENT_HEAT"],
      name: "Heat Affliction",
      duration: Number.POSITIVE_INFINITY,
      stackStrategy: "REFRESH_DURATION",
      maxStacks: 4,
    });
  }

  static ElementElectric() {
    return new EffectDefinition({
      id: "ELEMENT_ELECTRIC",
      tags: ["ELEMENT_ELECTRIC"],
      name: "Electric Affliction",
      duration: Number.POSITIVE_INFINITY,
      stackStrategy: "REFRESH_DURATION",
      maxStacks: 4,
    });
  }

  static ElementNature() {
    return new EffectDefinition({
      id: "ELEMENT_NATURE",
      tags: ["ELEMENT_NATURE"],
      name: "Nature Affliction",
      duration: Number.POSITIVE_INFINITY,
      stackStrategy: "REFRESH_DURATION",
      maxStacks: 4,
    });
  }

  static ElementHeatBurst() {
    return new EffectDefinition({
      id: "ELEMENT_HEAT_BURST",
      tags: ["ELEMENT_HEAT_BURST"],
      name: "Heat Burst",
      duration: Number.POSITIVE_INFINITY,
    });
  }

  static ElementCryoBurst() {
    return new EffectDefinition({
      id: "ELEMENT_CRYO_BURST",
      tags: ["ELEMENT_CRYO_BURST"],
      name: "Cryo Burst",
      duration: Number.POSITIVE_INFINITY,
    });
  }

  static ElementElectricBurst() {
    return new EffectDefinition({
      id: "ELEMENT_ELECTRIC_BURST",
      tags: ["ELEMENT_ELECTRIC_BURST"],
      name: "Electric Burst",
      duration: Number.POSITIVE_INFINITY,
    });
  }

  static ElementNatureBurst() {
    return new EffectDefinition({
      id: "ELEMENT_NATURE_BURST",
      tags: ["ELEMENT_NATURE_BURST"],
      name: "Nature Burst",
      duration: Number.POSITIVE_INFINITY,
    });
  }

  static ElementCombustion() {
    return new EffectDefinition({
      id: "ELEMENT_COMBUSTION",
      tags: ["ELEMENT_COMBUSTION"],
      name: "Combustion",
      duration: Number.POSITIVE_INFINITY,
    });
  }

  static ElementElectrification() {
    return new EffectDefinition({
      id: "ELEMENT_ELECTRIFICATION",
      tags: ["ELEMENT_ELECTRIFICATION"],
      name: "Electrification",
      duration: Number.POSITIVE_INFINITY,
    });
  }

  static ElementSolidification() {
    return new EffectDefinition({
      id: "ELEMENT_SOLIDIFICATION",
      tags: ["ELEMENT_SOLIDIFICATION"],
      name: "Solidification",
      duration: Number.POSITIVE_INFINITY,
    });
  }

  static ElementCorrosion() {
    return new EffectDefinition({
      id: "ELEMENT_CORROSION",
      tags: ["ELEMENT_CORROSION"],
      name: "Corrosion",
      duration: Number.POSITIVE_INFINITY,
    });
  }
}

export class EffectInstance {
  public store = new Map<string, any>();
  public stacks: { expiry: number }[] = [];
  public triggers: AnyEffectTrigger[];

  constructor(
    public readonly id: string,
    public readonly def: EffectDefinition,
    public readonly owner: SimEntityId,
    public readonly source: SimEntityId,
    public readonly startTime: number,
  ) {
    this.triggers = def.triggers.map((trigger) => ({
      ...trigger,
      ownerId: owner.id,
    }));
    this.addStack(startTime);
  }

  addStack(time: number) {
    if (this.stacks.length < this.def.maxStacks) {
      this.stacks.push({ expiry: time + this.def.duration });
      return;
    }

    if (this.def.stackStrategy === "REFRESH_DURATION") {
      this.stacks.forEach((stack) => {
        stack.expiry = time + this.def.duration;
      });
    } else if (this.def.stackStrategy === "ADD_DURATION") {
      this.stacks.forEach((stack) => {
        stack.expiry += this.def.duration;
      });
    }
  }

  get currentStacks() {
    return this.stacks.length;
  }

  snapshot(): EffectSnapshot {
    return {
      id: this.def.id,
      name: this.def.name,
      type: this.def.type,
      tags: this.def.tags,
      duration: this.def.duration,
      startTime: this.startTime,
      maxStacks: this.def.maxStacks,
      stackStrategy: this.def.stackStrategy,
      currentStacks: this.currentStacks,
      properties: this.def.properties,
    };
  }
}
