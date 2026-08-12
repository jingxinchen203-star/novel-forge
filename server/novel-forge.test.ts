import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("novel forge router", () => {
  it("returns the authenticated user through auth.me", async () => {
    const user = {
      id: 7,
      openId: "novel-user",
      name: "Novel Writer",
      email: "writer@example.com",
      loginMethod: "test",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const ctx: TrpcContext = {
      user,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const result = await appRouter.createCaller(ctx).auth.me();
    expect(result?.openId).toBe("novel-user");
    expect(result?.name).toBe("Novel Writer");
  });
});
