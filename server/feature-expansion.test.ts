import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const standaloneSource = readFileSync(resolve(process.cwd(), "client/src/components/StandaloneModules.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const trendSource = readFileSync(resolve(process.cwd(), "shared/fanqieTrends.ts"), "utf8");

describe("feature expansion contracts", () => {
  it("renders standalone modules when no project is selected", () => {
    expect(homeSource).toContain("StandaloneTrendPanel");
    expect(homeSource).toContain("StandaloneModulePanel");
    expect(homeSource).toContain('navigationTarget === "trends"');
    expect(standaloneSource).toContain('target === "versions"');
    expect(standaloneSource).toContain('target === "schedule"');
  });

  it("keeps Fanqie samples sourced and separated from user tags", () => {
    expect(trendSource).toContain("fanqienovel.com");
    expect(trendSource).toContain("FANQIE_TREND_SAMPLES");
    expect(homeSource).toContain("公开趋势观察样本");
    expect(standaloneSource).toContain("用户标签热度");
  });

  it("exposes server-side synopsis optimization for unsaved and saved projects", () => {
    expect(routerSource).toContain("optimizeSynopsis");
    expect(routerSource).toContain("projectId: z.number().optional()");
    expect(routerSource).toContain("reserveGenerationSlot");
    expect(homeSource).toContain("projects.optimizeSynopsis.useMutation");
    expect(homeSource).toContain("AI 优化简介");
  });
});
