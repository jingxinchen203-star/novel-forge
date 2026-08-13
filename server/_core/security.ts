import type { Request } from "express";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { ENV } from "./env";
import { getDb, generationUsage } from "../db";

export const TEXT_LIMITS = {
  projectSynopsis: 20000,
  document: 100000,
  outline: 200000,
  direction: 20000,
  style: 10000,
  chapterBody: 1000000,
} as const;

const WINDOW_MS = 60_000;
const LOCK_MS = 2 * 60_000;
const MAX_GENERATIONS_PER_MINUTE = 3;

export function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return false;
  try {
    const normalized = new URL(origin).origin;
    return ENV.allowedOrigins.includes(normalized);
  } catch {
    return false;
  }
}

export function hasTrustedMutationOrigin(req: Request) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host || isAllowedOrigin(origin);
  } catch {
    return false;
  }
}

export async function reserveGenerationSlot(userId: number, projectId: number) {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
  await db.insert(generationUsage).values({ userId, projectId, windowStartedAt: windowStart, windowCount: 0, activeUntil: null }).onDuplicateKeyUpdate({ set: { updatedAt: now } });
  const result = await db.update(generationUsage).set({
    windowCount: sql`IF(windowStartedAt < ${windowStart}, 1, windowCount + 1)`,
    windowStartedAt: sql`IF(windowStartedAt < ${windowStart}, ${windowStart}, windowStartedAt)`,
    activeUntil: new Date(now.getTime() + LOCK_MS),
    updatedAt: now,
  }).where(and(
    eq(generationUsage.userId, userId),
    eq(generationUsage.projectId, projectId),
    or(isNull(generationUsage.activeUntil), lt(generationUsage.activeUntil, now)),
    or(lt(generationUsage.windowStartedAt, windowStart), lt(generationUsage.windowCount, MAX_GENERATIONS_PER_MINUTE)),
  ));
  return result[0].affectedRows === 1;
}

export async function releasePersistentGenerationLock(userId: number, projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(generationUsage).set({ activeUntil: null }).where(and(eq(generationUsage.userId, userId), eq(generationUsage.projectId, projectId)));
}

// Small pure lock helpers remain useful for deterministic unit tests and non-DB callers.
const generationBuckets = new Map<string, { startedAt: number; count: number }>();
const generationLocks = new Set<string>();
export function acquireGenerationLock(userId: number, projectId: number) {
  const key = `${userId}:${projectId}`;
  if (generationLocks.has(key)) return false;
  generationLocks.add(key);
  return true;
}
export function releaseGenerationLock(userId: number, projectId: number) {
  generationLocks.delete(`${userId}:${projectId}`);
}
export function consumeGenerationSlot(userId: number, projectId: number) {
  const key = `${userId}:${projectId}`;
  const now = Date.now();
  const current = generationBuckets.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    generationBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_GENERATIONS_PER_MINUTE) return false;
  current.count += 1;
  return true;
}
