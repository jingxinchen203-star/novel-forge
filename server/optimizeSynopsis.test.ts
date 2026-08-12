import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  getProject: vi.fn(),
  reserveGenerationSlot: vi.fn(),
  releasePersistentGenerationLock: vi.fn(),
  hasTrustedMutationOrigin: vi.fn(() => true),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));
vi.mock("./_core/security", () => ({
  TEXT_LIMITS: { projectSynopsis: 20000, document: 100000, outline: 200000, direction: 20000, style: 10000, chapterBody: 1000000 },
  reserveGenerationSlot: mocks.reserveGenerationSlot,
  releasePersistentGenerationLock: mocks.releasePersistentGenerationLock,
  hasTrustedMutationOrigin: mocks.hasTrustedMutationOrigin,
}));
vi.mock("./db", () => ({
  getDb: vi.fn(), getProject: mocks.getProject, getProjectDocs: vi.fn(), getProjects: vi.fn(), getChapters: vi.fn(), getTrends: vi.fn(), getNotifications: vi.fn(),
  chapters: {}, contentVersions: {}, generationUsage: {}, novelProjects: {}, notifications: {}, projectDocs: {}, trendTags: {}, writingSchedules: {},
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx: TrpcContext = {
  user: { id: 7, openId: "writer", name: "Writer", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { headers: { origin: "https://novel.example", host: "novel.example" } } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("projects.optimizeSynopsis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasTrustedMutationOrigin.mockReturnValue(true);
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "一个失业厨师在听见食材心声后，卷入一场关于旧市场的秘密争夺。" } }] });
    mocks.reserveGenerationSlot.mockResolvedValue(true);
  });

  it("rejects an untrusted mutation origin before consuming quota", async () => {
    mocks.hasTrustedMutationOrigin.mockReturnValue(false);
    await expect(appRouter.createCaller({ ...ctx, req: { headers: { origin: "https://evil.example", host: "novel.example" } } as TrpcContext["req"] }).projects.optimizeSynopsis({ title: "跨源测试", genre: "都市", idea: "攻击者不应消耗生成额度" })).rejects.toThrow("Untrusted mutation origin");
    expect(mocks.reserveGenerationSlot).not.toHaveBeenCalled();
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("optimizes an unsaved project from the manually entered title, genre and idea", async () => {
    const result = await appRouter.createCaller(ctx).projects.optimizeSynopsis({ title: "听见锅铲的人", genre: "都市脑洞", idea: "失业厨师能听见食材说话，发现菜市场藏着秘密" });
    expect(result).toContain("失业厨师");
    expect(mocks.invokeLLM).toHaveBeenCalledOnce();
    expect(mocks.reserveGenerationSlot).toHaveBeenCalledWith(7, 0);
    expect(mocks.releasePersistentGenerationLock).toHaveBeenCalledWith(7, 0);
  });

  it("validates ownership and reserves/releases a slot for a saved project", async () => {
    mocks.getProject.mockResolvedValue({ id: 42, title: "旧市场", genre: "都市", synopsis: "", targetWords: 100000 });
    const result = await appRouter.createCaller(ctx).projects.optimizeSynopsis({ projectId: 42, idea: "厨师发现市场里的食材有自己的记忆" });
    expect(result).toContain("失业厨师");
    expect(mocks.getProject).toHaveBeenCalledWith(7, 42);
    expect(mocks.reserveGenerationSlot).toHaveBeenCalledWith(7, 42);
    expect(mocks.releasePersistentGenerationLock).toHaveBeenCalledWith(7, 42);
  });

  it("sanitizes an LLM failure and releases the saved-project lock", async () => {
    mocks.getProject.mockResolvedValue({ id: 42, title: "旧市场", genre: "都市", synopsis: "", targetWords: 100000 });
    mocks.invokeLLM.mockRejectedValue(new Error("provider secret"));
    await expect(appRouter.createCaller(ctx).projects.optimizeSynopsis({ projectId: 42, idea: "秘密市场" })).rejects.toThrow("ai_generation_failed");
    expect(mocks.releasePersistentGenerationLock).toHaveBeenCalled();
  });

  it("rejects a rate-limited saved project before calling the LLM", async () => {
    mocks.getProject.mockResolvedValue({ id: 42, title: "旧市场", genre: "都市", synopsis: "", targetWords: 100000 });
    mocks.reserveGenerationSlot.mockResolvedValue(false);
    await expect(appRouter.createCaller(ctx).projects.optimizeSynopsis({ projectId: 42, idea: "秘密市场" })).rejects.toThrow("生成请求过于频繁或项目正在生成");
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(mocks.releasePersistentGenerationLock).not.toHaveBeenCalled();
  });
});
