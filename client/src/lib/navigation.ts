export const NAV_TARGETS = ["overview", "workspace", "trends", "versions", "schedule"] as const;
export type NavTarget = (typeof NAV_TARGETS)[number];
export type WorkspaceTab = "outline" | "trends" | "versions" | "schedule";

export function currentHash() {
  return typeof window === "undefined" ? "" : window.location.hash;
}

const LAST_PROJECT_KEY = "novel-forge:last-project";

export function currentProjectId() {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("project");
  if (!value || !/^\d+$/.test(value)) return null;
  const projectId = Number(value);
  return Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null;
}

export function lastProjectId() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(LAST_PROJECT_KEY);
    const projectId = Number(value);
    return Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null;
  } catch {
    return null;
  }
}

export function rememberProjectId(projectId: number | null) {
  if (typeof window === "undefined") return;
  try {
    if (projectId) window.localStorage.setItem(LAST_PROJECT_KEY, String(projectId));
    else window.localStorage.removeItem(LAST_PROJECT_KEY);
  } catch {
    // Private browsing or blocked storage should not block navigation.
  }
}

export function projectNavigationUrl(projectId: number, target: NavTarget = "workspace") {
  if (typeof window === "undefined") return `#${target}`;
  const url = new URL(window.location.href);
  url.searchParams.set("project", String(projectId));
  url.hash = target;
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
