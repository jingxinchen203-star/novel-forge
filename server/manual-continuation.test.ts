import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routers = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const scheduled = readFileSync(resolve(process.cwd(), "server/scheduled.ts"), "utf8");
const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("manual continuation and AI writing actions", () => {
  it("exposes guarded document generation and manual continuation procedures", () => {
    expect(routers).toContain("generateDocument:");
    expect(routers).toContain("continueChapter:");
    expect(routers).toContain("reserveGenerationSlot(ctx.user.id, input.projectId)");
    expect(routers).toContain("releasePersistentGenerationLock(ctx.user.id, input.projectId)");
  });

  it("blocks creation or resumption of legacy automatic schedules", () => {
    expect(routers).toContain("自动续写已关闭，请在正文编辑中手动点击 AI 续写");
    expect(scheduled).toContain('skipped: "manual-only"');
    expect(scheduled).not.toContain("invokeLLM");
  });

  it("renders explicit AI actions for outline, documents, prose, and continuation", () => {
    expect(home).toContain("AI 生成本章正文");
    expect(home).toContain("AI 续写下一章");
    expect(home).toContain("function DocumentField");
    expect(home).toContain('field="worldSetting"');
    expect(home).toContain('field="characters"');
    expect(home).toContain('field="conflicts"');
    expect(home).toContain('field="styleGuide"');
    expect(home).toContain("生成 30 章提案");
    expect(home).toContain("disabled={saveDocs.isPending || generateDocument.isPending}");
    expect(home).toContain("续写方式");
    expect(home).toContain("自动续写已关闭");
  });
});
