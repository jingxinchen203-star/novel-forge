import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { currentHash, currentProjectId, lastProjectId, projectNavigationUrl, readNavTarget, rememberProjectId, resolveProjectSelection, targetAnchor, targetToWorkspaceTab } from "../client/src/lib/navigation";

const layoutSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const authSource = readFileSync(resolve(process.cwd(), "client/src/_core/hooks/useAuth.ts"), "utf8");

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
    expect(projectNavigationUrl(7, "trends")).toBe("/?from_webdev=1&project=7#trends");
    (globalThis as any).window = previousWindow;
  });

  it("restores the remembered project safely when storage is available", () => {
    const previousWindow = (globalThis as any).window;
    const storage = new Map<string, string>();
    (globalThis as any).window = { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } };
    expect(lastProjectId()).toBeNull();
    rememberProjectId(7);
    expect(lastProjectId()).toBe(7);
    rememberProjectId(null);
    expect(lastProjectId()).toBeNull();
    (globalThis as any).window = previousWindow;
  });

  it("falls back safely for invalid or deleted project links", () => {
    expect(resolveProjectSelection([3, 7], 7)).toBe(7);
    expect(resolveProjectSelection([3, 7], 999)).toBe(3);
    expect(resolveProjectSelection([], 999)).toBeNull();
  });

  it("keeps the requested module when a project link is repaired", () => {
    const previousWindow = (globalThis as any).window;
    (globalThis as any).window = { location: { href: "https://novel.test/?from_webdev=1&project=999#trends" } };
    expect(projectNavigationUrl(3, "trends")).toBe("/?from_webdev=1&project=3#trends");
    (globalThis as any).window = previousWindow;
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
    expect(layoutSource).toContain("navigateToTarget(item.target)");
    expect(layoutSource).toContain("window.dispatchEvent(new Event(\"hashchange\"))");
    expect(layoutSource).toContain("isActive={activeTarget === item.target}");
    expect(layoutSource).not.toContain("location === item.path");
    expect(homeSource).toContain("readNavTarget(currentHash())");
    expect(homeSource).toContain("targetToWorkspaceTab");
    expect(homeSource).toContain('value={activeTab} onValueChange={setActiveTab}');
    expect(layoutSource).toContain("登录验证未完成或会话已失效");
    expect(layoutSource).toContain("重新登录");
    expect(homeSource).toContain("AI 暂时无法生成，请稍后重试");
    expect(homeSource).toContain("novel-forge-chapter-editor");
    expect(homeSource).toContain("下载 TXT");
    expect(homeSource).toContain("Markdown");
    expect(homeSource).toContain("备份项目");
    expect(homeSource).toContain("lastProjectId()");
    expect(homeSource).toContain("rememberProjectId");
    expect(authSource).toContain('const RETURN_TO_KEY = "novel-forge:return-to"');
    expect(authSource).toContain("returnTo.startsWith(\"/\")");
    expect(authSource).toContain("window.localStorage.setItem(RETURN_TO_KEY");
    expect(homeSource).toContain("当前项目正在生成或请求过于频繁");
    for (const tab of ["trends", "versions", "schedule"]) expect(homeSource).toContain(`value="${tab}"`);
    expect(homeSource).toContain("function ProjectModulePage");
    expect(homeSource).toContain('navigationTarget === "trends" || navigationTarget === "versions" || navigationTarget === "schedule"');
    expect(homeSource).not.toContain('<TabsTrigger\n            value="trends"');
    expect(homeSource).not.toContain('<TabsTrigger\n            value="versions"');
    expect(homeSource).not.toContain('<TabsTrigger\n            value="schedule"');
  });
});
