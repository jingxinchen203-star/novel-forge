import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readNavTarget, targetAnchor, targetToWorkspaceTab } from "../client/src/lib/navigation";

const layoutSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("sidebar navigation", () => {
  it("resolves all menu targets from hash and safely falls back for unknown hashes", () => {
    for (const target of ["overview", "workspace", "trends", "versions", "schedule"] as const) {
      expect(readNavTarget(`#${target}`)).toBe(target);
    }
    expect(readNavTarget("#unknown")).toBe("overview");
    expect(readNavTarget("")).toBe("overview");
  });

  it("maps feature targets to the matching workspace tabs and anchors", () => {
    expect(targetToWorkspaceTab("trends")).toBe("trends");
    expect(targetToWorkspaceTab("versions")).toBe("versions");
    expect(targetToWorkspaceTab("schedule")).toBe("schedule");
    expect(targetToWorkspaceTab("overview")).toBe("outline");
    expect(targetAnchor("overview")).toBe("novel-forge-overview");
    expect(targetAnchor("workspace")).toBe("novel-forge-workspace");
    expect(targetAnchor("trends")).toBeUndefined();
  });

  it("wires the sidebar and workspace to the shared hash contract", () => {
    for (const target of ["overview", "workspace", "trends", "versions", "schedule"]) {
      expect(layoutSource).toContain(`target: "${target}"`);
    }
    expect(layoutSource).toContain("window.location.hash = item.target");
    expect(layoutSource).toContain("activeTarget === item.target");
    expect(homeSource).toContain("readNavTarget(window.location.hash)");
    expect(homeSource).toContain("targetToWorkspaceTab");
    expect(homeSource).toContain('value={activeTab} onValueChange={setActiveTab}');
    for (const tab of ["trends", "versions", "schedule"]) expect(homeSource).toContain(`value="${tab}"`);
  });
});
