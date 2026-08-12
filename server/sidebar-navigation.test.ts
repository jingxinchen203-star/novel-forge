import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const layoutSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("sidebar navigation contract", () => {
  it("declares five distinct navigation targets and derives active state from target", () => {
    for (const target of ["overview", "workspace", "trends", "versions", "schedule"]) {
      expect(layoutSource).toContain(`target: "${target}"`);
    }
    expect(layoutSource).toContain("activeTarget === item.target");
    expect(layoutSource).toContain('detail: item.target');
  });

  it("keeps overview/workspace anchors and maps feature targets to controlled tabs", () => {
    expect(homeSource).toContain('id="novel-forge-overview"');
    expect(homeSource).toContain('id="novel-forge-workspace"');
    expect(homeSource).toContain('value={activeTab} onValueChange={setActiveTab}');
    expect(homeSource).toContain('target === "trends" || target === "versions" || target === "schedule"');
    expect(homeSource).toContain("setActiveTab(nextTab)");
    for (const tab of ["trends", "versions", "schedule"]) {
      expect(homeSource).toContain(`value="${tab}"`);
    }
  });
});
