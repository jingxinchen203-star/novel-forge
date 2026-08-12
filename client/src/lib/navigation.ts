export const NAV_TARGETS = ["overview", "workspace", "trends", "versions", "schedule"] as const;
export type NavTarget = (typeof NAV_TARGETS)[number];
export type WorkspaceTab = "outline" | "trends" | "versions" | "schedule";

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
