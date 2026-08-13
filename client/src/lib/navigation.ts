export const NAV_TARGETS = ["overview", "workspace", "trends", "versions", "schedule"] as const;
export type NavTarget = (typeof NAV_TARGETS)[number];
export type WorkspaceTab = "outline" | "trends" | "versions" | "schedule";

export function currentHash() {
  return typeof window === "undefined" ? "" : window.location.hash;
}

export function currentProjectId() {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("project");
  if (!value || !/^\d+$/.test(value)) return null;
  const projectId = Number(value);
  return Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null;
}

export function projectNavigationUrl(projectId: number) {
  if (typeof window === "undefined") return "#workspace";
  const url = new URL(window.location.href);
  url.searchParams.set("project", String(projectId));
  url.hash = "workspace";
  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveProjectSelection(projectIds: number[], requestedId: number | null) {
  if (requestedId !== null && projectIds.includes(requestedId)) return requestedId;
  return projectIds[0] ?? null;
}

export function readNavTarget(hash: string): NavTarget {
  const target = hash.replace(/^#/, "");
  return (NAV_TARGETS as readonly string[]).includes(target) ? target as NavTarget : "overview";
}

export function targetToWorkspaceTab(target: NavTarget): WorkspaceTab {
  if (target === "trends" || target === "versions" || target === "schedule") return target;
  return "outline";
}

export function targetAnchor(target: NavTarget): string | undefined {
  if (target === "overview") return "novel-forge-overview";
  if (target === "workspace") return "novel-forge-workspace";
  return undefined;
}
