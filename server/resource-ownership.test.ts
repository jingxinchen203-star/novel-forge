import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getProject: vi.fn(async () => undefined),
  getProjectDocs: vi.fn(),
  getProjects: vi.fn(),
  getChapters: vi.fn(),
  getTrends: vi.fn(),
  getNotifications: vi.fn(),
}));

vi.mock("./db", () => ({
  ...mocks,
  chapters: {},
  contentVersions: {},
  generationUsage: {},
  novelProjects: {},
  notifications: {},
  projectDocs: {},
  trendTags: {},
  writingSchedules: {},
}));

const { getDb, getProject } = mocks;

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("resource ownership before generation reservation", () => {
  it("rejects an invalid project before touching the database quota path", async () => {
    const ctx: TrpcContext = {
      user: { id: 7, openId: "writer", name: "Writer", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: { headers: { origin: "https://novel.example", host: "novel.example" } } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    await expect(appRouter.createCaller(ctx).workspace.generateOutline({ projectId: 99999, direction: "测试方向", chapterCount: 3 })).rejects.toThrow();
    expect(getDb).not.toHaveBeenCalled();
    expect(getProject).toHaveBeenCalledWith(7, 99999);
  });
});
