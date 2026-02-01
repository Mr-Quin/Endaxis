import type { SimEntityId, SimEvent } from "../events/event.types";
import type { SimulationContext } from "../engine/SimulationContext";
import { EffectDefinition, EffectInstance } from "../effects/Effect";
import type { EffectTag } from "../effects/Effect";

export class EffectManager {
  private counter = 0;
  private effectInstances: Map<string, EffectInstance> = new Map();
  private tagCounts: Map<EffectTag, number> = new Map();

  constructor(private owner: SimEntityId) { }

  add(
    effect: EffectDefinition,
    source: SimEntityId,
    startTime: number,
  ): EffectInstance {
    const existing = this.getByEffectId(effect.id);

    // 同id堆叠
    if (existing && effect.maxStacks > 1) {
      this.handleStacking(existing, startTime);
      return existing;
    }

    const instanceId = `${effect.id}_${this.counter++}`;

    const instance = new EffectInstance(
      instanceId,
      effect,
      this.owner,
      source,
      startTime,
    );

    this.effectInstances.set(instanceId, instance);
    this.updateTags(instance.def, 1);

    return instance;
  }

  remove(instanceId: string): EffectInstance | undefined {
    const instance = this.effectInstances.get(instanceId);
    if (instance) {
      this.effectInstances.delete(instanceId);
      this.updateTags(instance.def, -1);
    }
    return instance;
  }

  hasTag(tag: EffectTag): boolean {
    return (this.tagCounts.get(tag) || 0) > 0;
  }

  getByTag(tag: EffectTag): EffectInstance[] {
    const results: EffectInstance[] = [];
    for (const instance of this.effectInstances.values()) {
      if (instance.def.tags.includes(tag)) results.push(instance);
    }
    return results;
  }

  getAll(): EffectInstance[] {
    return Array.from(this.effectInstances.values());
  }

  getAllTags(): EffectTag[] {
    const tags = Array.from(this.tagCounts.keys());
    return tags.filter((tag) => this.tagCounts.get(tag)! > 0);
  }

  handleEvent(event: SimEvent, ctx: SimulationContext) {
    for (const instance of this.effectInstances.values()) {
      const triggers = instance.triggers;
      for (let idx = 0; idx < triggers.length; idx += 1) {
        const trigger = triggers[idx]!;

        if (trigger.event !== event.type) {
          continue
        };

        if (
          trigger.sourceCondition === "self" &&
          event.source?.id !== trigger.ownerId
        ) {
          continue;
        }

        if (trigger.condition && !trigger.condition(event as any, ctx, instance)) {
          continue;
        }

        trigger.action(event as any, ctx, instance);

        if (trigger.once) {
          triggers.splice(idx, 1);
          idx -= 1;
        }
      }
    }
  }

  private handleStacking(existing: EffectInstance, startTime: number) {
    existing.addStack(startTime);
  }

  private getByEffectId(id: string): EffectInstance | undefined {
    return this.effectInstances
      .values()
      .find((instance) => instance.def.id === id);
  }

  private updateTags(effect: EffectDefinition, delta: number) {
    effect.tags.forEach((tag) => {
      const current = this.tagCounts.get(tag) || 0;
      this.tagCounts.set(tag, Math.max(0, current + delta));
    });
  }
}
