import { assert } from "@/utils/assert";
import { createEffectTrigger, Effect } from "../../effects/Effect";

export const ArclightSkillEffect1 = new Effect({
  id: "arclight_skill_effect_1",
  name: "Tempestuous Arc Effect",
  type: "buff",
  tags: [],
  duration: 0,
  maxStacks: 1,
  stackStrategy: "REFRESH_DURATION",
  triggers: [
    createEffectTrigger({
      event: "DAMAGE_TICK",
      sourceCondition: "self",
      once: true,
      condition: (_, ctx) => {
        return ctx.state.enemy.effects.hasTag("ELEMENT_ELECTRIFICATION");
      },
      action: (event, ctx) => {
        ctx.queue.enqueue({
          type: "DAMAGE_TICK",
          time: ctx.state.getCurrentTime(),
          source: event.source,
          target: event.target ?? { id: event.payload.targetId, type: "ENEMY" },
          rootSource: event.rootSource,
          payload: {
            actorId: event.payload.actorId,
            targetId: event.payload.targetId,
            damage: 100,
            stagger: 0,
            sp: 10,
            actionId: "arclight_skill_effect_1",
          },
        });
        const electrificationEffect = ctx.state.enemy.effects.getByTag(
          "ELEMENT_ELECTRIFICATION",
        );

        assert(
          electrificationEffect.length === 1,
          "should have one electrification effect",
        );

        ctx.queue.enqueue({
          type: "EFFECT_END",
          time: ctx.state.getCurrentTime(),
          source: event.source,
          target: event.target ?? { id: event.payload.targetId, type: "ENEMY" },
          rootSource: event.rootSource,
          payload: {
            type: "consumption",
            effectInstanceId: electrificationEffect[0]!.id,
          },
        });
      },
    }),
  ],
});
