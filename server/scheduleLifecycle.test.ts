import { describe, expect, it, vi } from "vitest";
import { createScheduleWithCleanup } from "./scheduleLifecycle";

describe("schedule lifecycle compensation", () => {
  it("deletes the remote cron when persistence fails", async () => {
    const remove = vi.fn(async () => undefined);
    await expect(createScheduleWithCleanup({
      sessionToken: "session-1",
      create: async () => ({ taskUid: "task-1" }),
      persist: async () => { throw new Error("duplicate schedule"); },
      remove,
    })).rejects.toThrow("schedule_create_failed");
    expect(remove).toHaveBeenCalledWith("task-1", "session-1");
  });

  it("does not remove a cron when persistence succeeds", async () => {
    const remove = vi.fn(async () => undefined);
    const persist = vi.fn(async () => undefined);
    const result = await createScheduleWithCleanup({
      sessionToken: "session-1",
      create: async () => ({ taskUid: "task-2" }),
      persist,
      remove,
    });
    expect(result.taskUid).toBe("task-2");
    expect(persist).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });
});
