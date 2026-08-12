import { beforeEach, describe, expect, it, vi } from "vitest";

let dbMock: any;

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ kind: "and", args }),
  eq: (...args: unknown[]) => ({ kind: "eq", args }),
  isNull: (...args: unknown[]) => ({ kind: "isNull", args }),
  lt: (...args: unknown[]) => ({ kind: "lt", args }),
  or: (...args: unknown[]) => ({ kind: "or", args }),
  sql: (...args: unknown[]) => ({ kind: "sql", args }),
}));

vi.mock("./db", () => ({
  getDb: vi.fn(async () => dbMock),
  generationUsage: { userId: "userId", projectId: "projectId", activeUntil: "activeUntil", windowStartedAt: "windowStartedAt", windowCount: "windowCount" },
}));

import { releasePersistentGenerationLock, reserveGenerationSlot } from "./_core/security";

function makeDb(affectedRows: number) {
  const updateWhere = vi.fn(async () => [{ affectedRows }]);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const insertDuplicate = vi.fn(async () => undefined);
  const insertValues = vi.fn(() => ({ onDuplicateKeyUpdate: insertDuplicate }));
  return {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
    updateWhere,
    updateSet,
    insertDuplicate,
  };
}

describe("persistent generation usage", () => {
  beforeEach(() => { dbMock = makeDb(1); });

  it("upserts usage then accepts an atomic reservation", async () => {
    expect(await reserveGenerationSlot(11, 22)).toBe(true);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    const update = dbMock.updateSet.mock.calls[0][0];
    expect(update.windowCount.kind).toBe("sql");
    expect(update.windowStartedAt.kind).toBe("sql");
    expect(update.activeUntil).toBeInstanceOf(Date);
  });

  it("rejects when the atomic update affects no row", async () => {
    dbMock = makeDb(0);
    expect(await reserveGenerationSlot(11, 22)).toBe(false);
    expect(dbMock.updateSet.mock.calls[0][0].windowCount.kind).toBe("sql");
  });

  it("serializes manual and scheduled callers through the same reservation row", async () => {
    const firstUpdate = dbMock.updateWhere;
    firstUpdate.mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{ affectedRows: 0 }]);
    expect(await reserveGenerationSlot(11, 22)).toBe(true);
    expect(await reserveGenerationSlot(11, 22)).toBe(false);
    expect(dbMock.update).toHaveBeenCalledTimes(2);
  });

  it("releases the persistent activeUntil lock", async () => {
    await releasePersistentGenerationLock(11, 22);
    expect(dbMock.update).toHaveBeenCalledTimes(1);
  });
});
