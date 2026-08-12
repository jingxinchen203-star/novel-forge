import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StandaloneModulePanel, StandaloneTrendPanel } from "../client/src/components/StandaloneModules";
import { FANQIE_TREND_SAMPLES, FANQIE_TREND_SOURCE } from "../shared/fanqieTrends";

vi.mock("../client/src/components/ui/button", () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));

describe("standalone module rendering", () => {
  it("renders sourced public trend samples separately from user tags", () => {
    const html = renderToStaticMarkup(<StandaloneTrendPanel trends={[{ id: 1, label: "我的都市标签", category: "自定义", heat: 55, note: "用户备注" }]} />);
    expect(html).toContain("题材趋势库");
    expect(html).toContain("公开趋势观察样本");
    expect(html).toContain(FANQIE_TREND_SOURCE.collectedAt);
    expect(html).toContain(FANQIE_TREND_SAMPLES[0].label);
    expect(html).toContain("我的都市标签");
    expect(html).toContain("用户标签热度");
  });

  it.each([["versions", "版本档案"], ["schedule", "续写计划"]] as const)("renders the %s project binding panel", (target, title) => {
    const html = renderToStaticMarkup(<StandaloneModulePanel target={target} onCreate={() => undefined} />);
    expect(html).toContain(title);
    expect(html).toContain("请先建立或选择一部小说");
    expect(html).toContain("建立首个项目");
  });
});
