import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";
import { chapters, getDb, getProjectDocs, novelProjects, notifications, writingSchedules } from "./db";

export function normalizeContent(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => typeof part === "object" && part && "text" in part ? String((part as { text?: unknown }).text ?? "") : "").join("");
  return "";
}

const LOCK_TTL_MS = 2 * 60 * 1000;

export async function runScheduledContinuation(req: Request, res: Response) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID();
  let scheduleId: number | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "database-unavailable", requestId });
    const schedule = (await db.select().from(writingSchedules).where(and(eq(writingSchedules.scheduleCronTaskUid, user.taskUid), eq(writingSchedules.enabled, 1))).limit(1))[0];
    if (!schedule) return res.json({ ok: true, skipped: "orphan-or-disabled" });
    scheduleId = schedule.id;
    const now = new Date();
    const staleBefore = new Date(now.getTime() - LOCK_TTL_MS);
    const claim = await db.update(writingSchedules).set({ lockAt: now, lastError: null }).where(and(eq(writingSchedules.id, schedule.id), eq(writingSchedules.enabled, 1), or(isNull(writingSchedules.lockAt), lt(writingSchedules.lockAt, staleBefore))));
    if (claim[0].affectedRows !== 1) return res.json({ ok: true, skipped: "locked-or-disabled" });

    const project = (await db.select().from(novelProjects).where(and(eq(novelProjects.id, schedule.projectId), eq(novelProjects.userId, schedule.userId))).limit(1))[0];
    if (!project) {
      await db.update(writingSchedules).set({ lockAt: null, lastError: "project-missing" }).where(eq(writingSchedules.id, schedule.id));
      return res.json({ ok: true, skipped: "project-missing" });
    }
    const previous = (await db.select().from(chapters).where(and(eq(chapters.projectId, project.id), eq(chapters.userId, project.userId))).orderBy(desc(chapters.chapterNumber)).limit(1))[0];
    const docs = await getProjectDocs(project.userId, project.id);
    const chapterNumber = (previous?.chapterNumber ?? 0) + 1;
    const existingNext = (await db.select().from(chapters).where(and(eq(chapters.projectId, project.id), eq(chapters.userId, project.userId), eq(chapters.chapterNumber, chapterNumber))).limit(1))[0];
    if (existingNext) {
      await db.update(writingSchedules).set({ lockAt: null, lastRunAt: now, lastError: null }).where(eq(writingSchedules.id, schedule.id));
      return res.json({ ok: true, skipped: "already-generated", chapterNumber });
    }
    const outline = previous ? `承接第${previous.chapterNumber}章的悬念，推进主线冲突并在结尾留下新的阅读钩子。` : "建立开篇冲突，完成主角首次选择。";
    const result = await invokeLLM({ model: "gpt-5-mini", maxTokens: 6000, messages: [
      { role: "system", content: "你是中文网文作者。请直接输出章节正文，不要解释过程，保持设定一致，适合移动端阅读。" },
      { role: "user", content: `书名：${project.title}\n题材：${project.genre}\n世界观：${docs?.worldSetting ?? ""}\n人物：${docs?.characters ?? ""}\n上一章：${previous?.body?.slice(-3000) ?? "无"}\n本章方向：${outline}\n目标字数：3000` },
    ] });
    const body = normalizeContent(result.choices[0]?.message?.content);
    if (!body.trim()) throw new Error("empty-generation");
    await db.insert(chapters).values({ projectId: project.id, userId: project.userId, chapterNumber, title: `第${chapterNumber}章`, outline, body, targetWords: 3000, status: "draft" });
    await db.insert(notifications).values({ userId: project.userId, projectId: project.id, title: "自动续写已完成", message: `《${project.title}》第 ${chapterNumber} 章已生成，可以进入工作台审核。` });
    await db.update(writingSchedules).set({ lockAt: null, lastRunAt: new Date(), lastError: null }).where(eq(writingSchedules.id, schedule.id));
    res.json({ ok: true, projectId: project.id, chapterNumber, requestId });
  } catch (error) {
    if (scheduleId) {
      const db = await getDb();
      await db?.update(writingSchedules).set({ lockAt: null, lastError: `${requestId}:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}` }).where(eq(writingSchedules.id, scheduleId));
    }
    res.status(500).json({ error: "scheduled_continuation_failed", requestId, timestamp });
  }
}
