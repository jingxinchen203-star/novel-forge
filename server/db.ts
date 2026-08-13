import { and, desc, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import { getDraftBackupIdsToDelete } from "@shared/draftCleanup";
import {
  chapters,
  contentVersions,
  novelProjects,
  notifications,
  projectDocs,
  trendTags,
  trendRefreshRuns,
  writingSchedules,
  generationUsage,
  users,
  type InsertUser,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getProjects(userId: number) {
  const db = await getDb();
  return db ? db.select().from(novelProjects).where(eq(novelProjects.userId, userId)).orderBy(desc(novelProjects.updatedAt)) : [];
}

export async function getProject(userId: number, projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(novelProjects).where(and(eq(novelProjects.userId, userId), eq(novelProjects.id, projectId))).limit(1);
  return result[0];
}

export async function getProjectDocs(userId: number, projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectDocs).where(and(eq(projectDocs.userId, userId), eq(projectDocs.projectId, projectId))).limit(1);
  return result[0];
}

export async function getChapters(userId: number, projectId: number) {
  const db = await getDb();
  return db ? db.select().from(chapters).where(and(eq(chapters.userId, userId), eq(chapters.projectId, projectId))).orderBy(chapters.chapterNumber) : [];
}

export async function getTrends(userId: number) {
  const db = await getDb();
  return db ? db.select().from(trendTags).where(eq(trendTags.userId, userId)).orderBy(desc(trendTags.heat)) : [];
}

export async function getTrendRefreshRuns(userId: number) {
  const db = await getDb();
  return db ? db.select().from(trendRefreshRuns).where(eq(trendRefreshRuns.userId, userId)).orderBy(desc(trendRefreshRuns.startedAt)).limit(20) : [];
}

export async function cleanupDraftBackups(userId: number, projectId: number, options?: { retentionDays?: number; keepLatest?: number }) {
  const db = await getDb();
  if (!db) return { deleted: 0 };
  const retentionDays = Math.max(1, Math.min(3650, options?.retentionDays ?? 30));
  const keepLatest = Math.max(1, Math.min(100, options?.keepLatest ?? 10));
  const backups = await db.select({ id: contentVersions.id, createdAt: contentVersions.createdAt })
    .from(contentVersions)
    .where(and(
      eq(contentVersions.userId, userId),
      eq(contentVersions.projectId, projectId),
      like(contentVersions.label, "服务端草稿备份 ·%"),
    ))
    .orderBy(desc(contentVersions.createdAt));
  const idsToDelete = getDraftBackupIdsToDelete(backups, new Date(), { retentionDays, keepLatest });
  if (idsToDelete.length) {
    await db.delete(contentVersions).where(and(eq(contentVersions.userId, userId), eq(contentVersions.projectId, projectId), inArray(contentVersions.id, idsToDelete)));
  }
  return { deleted: idsToDelete.length };
}

export async function getNotifications(userId: number) {
  const db = await getDb();
  return db ? db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(30) : [];
}

export { chapters, contentVersions, generationUsage, novelProjects, notifications, projectDocs, trendTags, trendRefreshRuns, writingSchedules };
