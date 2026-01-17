import { describe, it, expect } from "vitest";
import { compileTimeline } from "./compiler";
import type { ActionNode } from "../types/timeline";

describe("compileTimeline", () => {
  const createMockAction = (
    id: string,
    startTime: number,
    duration: number,
    options: Partial<ActionNode["node"]> = {}
  ): ActionNode => ({
    id,
    trackIndex: 0,
    skillId: "mock_skill",
    node: {
      startTime,
      duration,
      type: options.type || "skill",
      animationTime: options.animationTime,
      triggerWindow: options.triggerWindow,
      ...options,
    },
  });

  it("should map basic actions without shifts", () => {
    const actions = [createMockAction("A", 0, 5), createMockAction("B", 6, 2)];

    const result = compileTimeline(actions);
    expect(result.actions).toHaveLength(2);
    expect(result.actions[0].realStartTime).toBe(0);
    expect(result.actions[1].realStartTime).toBe(6);
  });

  it("冻屏期间开始的动作应推迟", () => {
    const ult = createMockAction("ULT", 2, 5, {
      type: "ultimate",
      animationTime: 2,
    });
    const skill = createMockAction("SKILL", 3, 1, { type: "skill" });

    const result = compileTimeline([ult, skill]);

    const resolvedUlt = result.actions.find((a) => a.id === "ULT")!;
    const resolvedSkill = result.actions.find((a) => a.id === "SKILL")!;

    expect(resolvedUlt.realStartTime).toBe(2);
    expect(resolvedUlt.realDuration).toBe(5);

    // 推迟2秒
    expect(resolvedSkill.realStartTime).toBe(4);

    // 时间不变
    expect(resolvedSkill.realDuration).toBe(1);
  });

  it("冻屏期间未结束的动作应延长", () => {
    const ult = createMockAction("ULT", 2, 3, {
      type: "ultimate",
      animationTime: 1.5,
    });
    const skill = createMockAction("SKILL", 0, 2.2, { type: "skill" });

    const result = compileTimeline([ult, skill]);

    const resolvedUlt = result.actions.find((a) => a.id === "ULT")!;
    const resolvedSkill = result.actions.find((a) => a.id === "SKILL")!;

    expect(resolvedUlt.realStartTime).toBe(2);
    expect(resolvedUlt.realDuration).toBe(1.5);

    // 开始时间不变
    expect(resolvedSkill.realStartTime).toBe(0);

    // 时间延长
    expect(resolvedSkill.realDuration).toBe(3.2);
  });

  it("连携的冻屏可被缩短", () => {
    const link1 = createMockAction("LINK1", 0, 1.2, {
      type: "link",
      // 默认0.5秒
    });
    const link2 = createMockAction("LINK2", 0.1, 1.2, {
      type: "link",
    });

    const result = compileTimeline([link1, link2]);

    const l1 = result.actions.find((a) => a.id === "LINK1")!;
    const l2 = result.actions.find((a) => a.id === "LINK2")!;

    expect(l1.realStartTime).toBe(0);
    // 延迟l2的冻屏时间
    expect(l1.realDuration).toBe(1.7);
    expect(l2.realStartTime).toBe(0.1);
    expect(l2.realDuration).toBe(1.2);
  });

  it("终结技不可重叠", () => {
    const ult1 = createMockAction("ULT1", 0, 1.5, {
      type: "ultimate",
      animationTime: 1.5,
    });
    const ult2 = createMockAction("ULT2", 1, 2.7, {
      type: "ultimate",
      animationTime: 2.7,
    });

    const result = compileTimeline([ult1, ult2]);

    const r1 = result.actions.find((a) => a.id === "ULT1")!;
    const r2 = result.actions.find((a) => a.id === "ULT2")!;

    expect(r1.realStartTime).toBe(0);
    expect(r1.realDuration).toBe(1.5);
    // 延后至 ult1 结束
    expect(r2.realStartTime).toBe(1.5);
    expect(r2.realDuration).toBe(2.7);
  });

  it("should calculate consumption logic", () => {
    const producer = createMockAction("PROD", 0, 10, {
      physicalAnomaly: [
        [{ id: "eff1", offset: 0, duration: 10, type: "buff" }],
      ],
    });
    const consumer = createMockAction("CONS", 5, 2);

    const connections = [
      {
        id: "c1",
        fromEffectId: "eff1",
        to: "CONS",
        from: "PROD", // Added required fallback
        isConsumption: true,
        consumptionOffset: 0,
      },
    ];

    const result = compileTimeline([producer, consumer], { connections });

    const rProd = result.actions.find((a) => a.id === "PROD")!;
    const effect = rProd.effects[0];

    expect(effect).toBeDefined();
    expect(effect.isConsumed).toBe(true);
    expect(effect.displayDuration).toBe(5);
  });
});
