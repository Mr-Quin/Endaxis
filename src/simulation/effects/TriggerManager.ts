import type { SimulationContext } from "../engine/SimulationContext";
import type { SimEvent } from "../events/event.types";
import type { AnyEffectTrigger } from "./Effect";

export class TriggerManager {
  private listeners = new Map<string, AnyEffectTrigger[]>();

  register(trigger: AnyEffectTrigger) {
    if (!this.listeners.has(trigger.event)) {
      this.listeners.set(trigger.event, []);
    }
    this.listeners.get(trigger.event)!.push(trigger);
  }

  remove(trigger: AnyEffectTrigger) {
    const triggers = this.listeners.get(trigger.event);
    if (triggers) {
      const index = triggers.indexOf(trigger);
      if (index > -1) {
        triggers.splice(index, 1);
      }
    }
  }

  checkTriggers(event: SimEvent, ctx: SimulationContext) {
    const triggers = this.listeners.get(event.type) || [];

    for (const trigger of triggers) {
      if (
        trigger.sourceCondition === "self" &&
        "actorId" in event.payload &&
        event.payload["actorId"] !== trigger.ownerId
      )
        continue;

      // We know trigger.event === event.type, so casting is safe
      if (trigger.condition && !trigger.condition(event as any, ctx)) {
        continue;
      }

      // 检查冷却
      //   if (trigger.cooldownId) {
      //     if (!ctx.state.checkCooldown(trigger.cooldownId)) {
      //       continue;
      //     }
      //     ctx.state.triggerCooldown(trigger.cooldownId, trigger.cooldownDuration);
      //   }

      (trigger.action as any)(event, ctx);

      if (trigger.once) {
        this.remove(trigger);
      }
    }
  }
}
