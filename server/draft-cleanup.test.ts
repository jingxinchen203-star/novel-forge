import { describe, expect, it } from "vitest";
import { getDraftBackupIdsToDelete } from "@shared/draftCleanup";

describe("draft backup cleanup policy", () => {
  const now = new Date("2026-08-13T00:00:00.000Z");

  it("keeps the newest backups and removes entries outside the retention window", () => {
    const backups = [
      { id: 5, createdAt: new Date("2026-08-12T00:00:00.000Z") },
      { id: 4, createdAt: new Date("2026-07-20T00:00:00.000Z") },
      { id: 3, createdAt: new Date("2026-07-10T00:00:00.000Z") },
      { id: 2, createdAt: new Date("2026-06-01T00:00:00.000Z") },
    ];
    expect(getDraftBackupIdsToDelete(backups, now, { retentionDays: 30, keepLatest: 2 })).toEqual([3, 2]);
  });

  it("caps retained backups by count even when all are recent", () => {
    const backups = [1, 2, 3, 4].map(id => ({ id, createdAt: new Date("2026-08-12T00:00:00.000Z") }));
    expect(getDraftBackupIdsToDelete(backups, now, { retentionDays: 30, keepLatest: 2 })).toEqual([3, 4]);
  });

  it("clamps unsafe options to bounded values", () => {
    const backups = [{ id: 1, createdAt: new Date("2020-01-01T00:00:00.000Z") }];
    expect(getDraftBackupIdsToDelete(backups, now, { retentionDays: 0, keepLatest: 0 })).toEqual([1]);
  });
});
