import { describe, expect, it } from "vitest";
import { getDb, projectDocs, writingSchedules } from "./db";

const rollback = Symbol("rollback");

describe("database uniqueness constraints", () => {
  it("rejects duplicate project_docs rows inside a rolled-back transaction", async () => {
    const db = await getDb();
    if (!db) return;
    await expect(db.transaction(async tx => {
      await tx.insert(projectDocs).values({ userId: -91001, projectId: -91001, outline: "one", worldSetting: "world", characters: "characters", conflicts: "conflicts", styleGuide: "style" });
      await expect(tx.insert(projectDocs).values({ userId: -91001, projectId: -91001, outline: "two", worldSetting: "world", characters: "characters", conflicts: "conflicts", styleGuide: "style" })).rejects.toThrow();
      throw rollback;
    })).rejects.toBe(rollback);
  });

  it("rejects duplicate writing_schedules rows inside a rolled-back transaction", async () => {
    const db = await getDb();
    if (!db) return;
    await expect(db.transaction(async tx => {
      await tx.insert(writingSchedules).values({ userId: -92001, projectId: -92001, cronExpression: "0 0 22 * * *", timezone: "UTC", enabled: 1, scheduleCronTaskUid: "constraint-test-1" });
      await expect(tx.insert(writingSchedules).values({ userId: -92001, projectId: -92001, cronExpression: "0 1 22 * * *", timezone: "UTC", enabled: 1, scheduleCronTaskUid: "constraint-test-2" })).rejects.toThrow();
      throw rollback;
    })).rejects.toBe(rollback);
  });
});
