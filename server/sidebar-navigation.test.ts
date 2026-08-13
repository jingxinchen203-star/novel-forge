import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { currentHash, currentProjectId, projectNavigationUrl, readNavTarget, resolveProjectSelection, targetAnchor, targetToWorkspaceTab } from "../client/src/lib/navigation";

const layoutSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("sidebar navigation", () => {
  it("resolves all menu targets from hash and safely falls back for unknown hashes", () => {
    for (const target of ["overview", "workspace", "trends", "versions", "schedule"] as const) {
      expect(readNavTarget(`#${target}`)).toBe(target);
    }
    expect(readNavTarget("#unknown")).toBe("overview");
    expect(readNavTarget("")).toBe("overview");
    expect(currentHash()).toBe("");
  });

  it("parses project deep links and preserves existing query parameters", () => {
    const previousWindow = (globalThis as any).window;
    (globalThis as any).window = { location: { search: "?from_webdev=1&project=42", href: "https://novel.test/?from_webdev=1&project=42#workspace", hash: "#workspace" } };
    expect(currentProjectId()).toBe(42);
    expect(projectNavigationUrl(7)).toBe("/?from_webdev=1&project=7#workspace");
    (globalThis as any).window = previousWindow;
  });

  it("falls back safely for invalid or deleted project links", () => {
    expect(resolveProjectSelection([3, 7], 7)).toBe(7);
    expect(resolveProjectSelection([3, 7], 999)).toBe(3);
    expect(resolveProjectSelection([], 999)).toBeNull();
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
    expect(layoutSource).toContain("href={`#${item.target}`}");
    expect(layoutSource).toContain("isActive={activeTarget === item.target}");
    expect(layoutSource).not.toContain("location === item.path");
    expect(homeSource).toContain("readNavTarget(currentHash())");
    expect(homeSource).toContain("targetToWorkspaceTab");
    expect(homeSource).toContain('value={activeTab} onValueChange={setActiveTab}');
    for (const tab of ["trends", "versions", "schedule"]) expect(homeSource).toContain(`value="${tab}"`);
  });
});
