import { createEffectTrigger, EffectDefinition } from "../../effects/Effect";

export const effectOriginiumCrystal = new EffectDefinition({
  id: "endministrator_effect_originium_crystal",
  name: "Originium Crystal",
  type: "buff",
  tags: [],
  duration: 10,
  maxStacks: 1,
  stackStrategy: "REFRESH_DURATION",
  triggers: [
    createEffectTrigger({
      event: "EFFECT_START",
      condition: (event) => {
        const acceptTags = [
          "PHYSICAL_VULNERABLE",
          "PHYSICAL_KNOCK_DOWN",
          "PHYSICAL_LIFT",
          "PHYSICAL_BREACH",
          "PHYSICAL_CRUSH",
        ];

        return event.payload.effect.tags.some((tag) =>
          acceptTags.includes(tag),
        );
      },
      action: (event, ctx) => {
        ctx.queue.enqueue({
          type: "DAMAGE_TICK",
          time: ctx.state.getCurrentTime(),
          source: event.source,
          target: event.target,
          rootSource: event.rootSource,
          payload: {
            actorId: event.payload.actorId,
            targetId: event.payload.targetId,
            damage: 100,
            stagger: 0,
            actionId: "endministrator_effect_originium_crystal",
          },
        });
      },
    }),
  ],
});
