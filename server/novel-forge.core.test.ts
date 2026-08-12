import { describe, expect, it } from "vitest";
import { normalizeContent } from "./scheduled";
import { createHeartbeatJob } from "./_core/heartbeat";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("novel forge core contracts", () => {
  it("normalizes structured model content into chapter text", () => {
    expect(normalizeContent([{ text: "第一段" }, { text: "第二段" }])).toBe("第一段第二段");
    expect(normalizeContent("纯文本")).toBe("纯文本");
    expect(normalizeContent(null)).toBe("");
  });

  it("rejects an empty project title before reaching persistence", async () => {
    const ctx: TrpcContext = { user: { id: 1, openId: "u", name: "Writer", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    await expect(appRouter.createCaller(ctx).projects.create({ title: "", genre: "都市", synopsis: "", targetWords: 100000 })).rejects.toThrow();
  });

  it("rejects admin mutations from an untrusted origin", async () => {
    const ctx: TrpcContext = { user: { id: 1, openId: "admin", name: "Admin", email: null, loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: { origin: "https://attacker.example", host: "novel.example" } } as TrpcContext["req"], res: {} as TrpcContext["res"] };
    await expect(appRouter.createCaller(ctx).system.notifyOwner({ title: "x", content: "y" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not allow Heartbeat mutations without a user session", async () => {
    await expect(createHeartbeatJob({ name: "test", cron: "0 0 22 * * *", path: "/api/scheduled/continueNovel" }, "")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
