import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { countWritingUnits, writingGoalProgress } from "../shared/writingStats";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const layoutSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
const themeSource = readFileSync(resolve(process.cwd(), "client/src/contexts/ThemeContext.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("editor enhancements", () => {
  it("counts writing units without whitespace and clamps daily progress", () => {
    expect(countWritingUnits("你好 world\n  123")).toBe(10);
    expect(countWritingUnits(undefined)).toBe(0);
    expect(writingGoalProgress(500, 1000)).toBe(50);
    expect(writingGoalProgress(1500, 1000)).toBe(100);
    expect(writingGoalProgress(1, 0)).toBe(0);
  });

  it("wires persistent dark mode into the studio shell", () => {
    expect(themeSource).toContain('window.localStorage.getItem("theme")');
    expect(themeSource).toContain('window.localStorage.setItem("theme", theme)');
    expect(layoutSource).toContain("切换到夜间模式");
    expect(layoutSource).toContain("切换到日间模式");
  });

  it("wires writing stats, goal progress, and assistant modes", () => {
    expect(homeSource).toContain("当前章节");
    expect(homeSource).toContain("全书总字数");
    expect(homeSource).toContain("每日写作目标");
    expect(homeSource).toContain("AI 写作助手");
    expect(homeSource).toContain("一键润色");
    expect(homeSource).toContain("角色名字");
    expect(homeSource).toContain("剧情灵感");
    expect(homeSource).toContain("差异高亮");
    expect(homeSource).toContain("已保存");
    expect(homeSource).toContain("手动更新趋势");
    expect(routerSource).toContain("assistWriting");
    expect(routerSource).toContain("refresh: protectedProcedure");
    expect(routerSource).toContain('z.enum(["polish", "names", "ideas"])');
    expect(routerSource).toContain("reserveGenerationSlot(ctx.user.id, input.projectId)");
  });
});
