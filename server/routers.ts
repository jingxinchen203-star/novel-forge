import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router, securePublicMutation } from "./_core/trpc";
import { and, desc, eq } from "drizzle-orm";
import { getDb, getProject, getProjectDocs, getProjects, getChapters, getTrends, getNotifications, chapters, contentVersions, generationUsage, novelProjects, notifications, projectDocs, trendTags, writingSchedules } from "./db";
import { buildOhStorySystemPrompt, OH_STORY_METHOD } from "@shared/ohStoryMethod";
import { releasePersistentGenerationLock, reserveGenerationSlot, TEXT_LIMITS } from "./_core/security";
import { createScheduleWithCleanup } from "./scheduleLifecycle";

const projectInput = z.object({ title: z.string().trim().min(1).max(180), genre: z.string().trim().min(1).max(120), synopsis: z.string().max(TEXT_LIMITS.projectSynopsis).default(""), targetWords: z.number().int().min(1000).max(500000) });

async function requireProject(userId: number, id: number) {
  const project = await getProject(userId, id);
  if (!project) throw new Error("项目不存在或无权访问");
  return project;
}

async function requireChapter(userId: number, projectId: number, chapterId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const chapter = (await db.select().from(chapters).where(and(eq(chapters.id, chapterId), eq(chapters.projectId, projectId), eq(chapters.userId, userId))).limit(1))[0];
  if (!chapter) throw new Error("章节不存在或不属于当前项目");
  return chapter;
}

async function requireProjectDoc(userId: number, projectId: number) {
  await requireProject(userId, projectId);
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  return getProjectDocs(userId, projectId);
}

function getSessionToken(req: { headers: { cookie?: string } }) {
  return parseCookie(req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
}

async function requireEntity(userId: number, projectId: number, entityType: "outline" | "chapter", entityId: number) {
  if (entityType === "chapter") await requireChapter(userId, projectId, entityId);
  else await requireProjectDoc(userId, projectId);
}

async function requireVersion(userId: number, projectId: number, entityType: "outline" | "chapter", entityId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const version = (await db.select().from(contentVersions).where(and(eq(contentVersions.projectId, projectId), eq(contentVersions.userId, userId), eq(contentVersions.entityType, entityType), eq(contentVersions.entityId, entityId))).limit(1))[0];
  if (!version) throw new Error("版本不存在或实体归属不匹配");
  await requireEntity(userId, projectId, entityType, entityId);
  return version;
}

export function outlineSystemPrompt() {
  return buildOhStorySystemPrompt("你是资深网文总编。请输出清晰、可执行的章节大纲，包含章节号、标题、核心事件、冲突升级和章末钩子。不要复述指令。", OH_STORY_METHOD.outlinePrompt);
}

export function chapterSystemPrompt() {
  return buildOhStorySystemPrompt("你是成熟的中文网文作者。保持人物一致、叙事流畅、段落适合移动端阅读，严格围绕章节大纲推进，不要输出标题以外的解释。", OH_STORY_METHOD.prosePrompt);
}

async function textFromLLM(messages: { role: "system" | "user"; content: string }[]) {
  try {
    const result = await invokeLLM({ model: "gpt-5-mini", maxTokens: 6000, messages });
    const content = result.choices[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map(part => "text" in part ? part.text : "").join("") : "";
    if (!text.trim()) throw new Error("empty-generation");
    return text;
  } catch {
    throw new Error("ai_generation_failed");
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: securePublicMutation.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  projects: router({
    list: protectedProcedure.query(({ ctx }) => getProjects(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => requireProject(ctx.user.id, input.id)),
    create: protectedProcedure.input(projectInput).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      const [created] = await db.insert(novelProjects).values({ ...input, userId: ctx.user.id }).$returningId();
      return getProject(ctx.user.id, created.id);
    }),
    update: protectedProcedure.input(projectInput.extend({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      await requireProject(ctx.user.id, input.id);
      const { id, ...values } = input;
      await db.update(novelProjects).set(values).where(and(eq(novelProjects.id, id), eq(novelProjects.userId, ctx.user.id)));
      return getProject(ctx.user.id, id);
    }),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      await requireProject(ctx.user.id, input.id);
      const sessionToken = getSessionToken(ctx.req);
      const schedules = await db.select().from(writingSchedules).where(and(eq(writingSchedules.projectId, input.id), eq(writingSchedules.userId, ctx.user.id)));
      for (const schedule of schedules) if (schedule.scheduleCronTaskUid) await deleteHeartbeatJob(schedule.scheduleCronTaskUid, sessionToken);
      await db.transaction(async tx => {
        await tx.delete(notifications).where(and(eq(notifications.projectId, input.id), eq(notifications.userId, ctx.user.id)));
        await tx.delete(contentVersions).where(and(eq(contentVersions.projectId, input.id), eq(contentVersions.userId, ctx.user.id)));
        await tx.delete(chapters).where(and(eq(chapters.projectId, input.id), eq(chapters.userId, ctx.user.id)));
        await tx.delete(projectDocs).where(and(eq(projectDocs.projectId, input.id), eq(projectDocs.userId, ctx.user.id)));
        await tx.delete(writingSchedules).where(and(eq(writingSchedules.projectId, input.id), eq(writingSchedules.userId, ctx.user.id)));
        await tx.delete(generationUsage).where(and(eq(generationUsage.projectId, input.id), eq(generationUsage.userId, ctx.user.id)));
        await tx.delete(novelProjects).where(and(eq(novelProjects.id, input.id), eq(novelProjects.userId, ctx.user.id)));
      });
      return { success: true };
    }),
  }),
  trends: router({
    list: protectedProcedure.query(({ ctx }) => getTrends(ctx.user.id)),
    create: protectedProcedure.input(z.object({ label: z.string().trim().min(1).max(80), category: z.string().trim().min(1).max(80), heat: z.number().int().min(0).max(100), note: z.string().max(20000).default("") })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      await db.insert(trendTags).values({ ...input, userId: ctx.user.id }); return getTrends(ctx.user.id);
    }),
    update: protectedProcedure.input(z.object({ id: z.number(), label: z.string().trim().min(1).max(80), category: z.string().trim().min(1).max(80), heat: z.number().int().min(0).max(100), note: z.string().max(20000).default("") })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用"); const { id, ...values } = input;
      await db.update(trendTags).set(values).where(and(eq(trendTags.id, id), eq(trendTags.userId, ctx.user.id))); return getTrends(ctx.user.id);
    }),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      await db.delete(trendTags).where(and(eq(trendTags.id, input.id), eq(trendTags.userId, ctx.user.id))); return getTrends(ctx.user.id);
    }),
  }),
  workspace: router({
    get: protectedProcedure.input(z.object({ projectId: z.number() })).query(async ({ ctx, input }) => ({ project: await requireProject(ctx.user.id, input.projectId), docs: await getProjectDocs(ctx.user.id, input.projectId), chapters: await getChapters(ctx.user.id, input.projectId) })),
    saveDocs: protectedProcedure.input(z.object({ projectId: z.number(), outline: z.string().max(TEXT_LIMITS.outline).optional(), worldSetting: z.string().max(TEXT_LIMITS.document), characters: z.string().max(TEXT_LIMITS.document), conflicts: z.string().max(TEXT_LIMITS.document), styleGuide: z.string().max(TEXT_LIMITS.style) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用"); await requireProject(ctx.user.id, input.projectId);
      const existing = await getProjectDocs(ctx.user.id, input.projectId);
      if (existing) await db.update(projectDocs).set(input).where(eq(projectDocs.id, existing.id));
      else await db.insert(projectDocs).values({ ...input, userId: ctx.user.id });
      return getProjectDocs(ctx.user.id, input.projectId);
    }),
    generateOutline: protectedProcedure.input(z.object({ projectId: z.number(), direction: z.string().min(1).max(TEXT_LIMITS.direction), chapterCount: z.number().int().min(3).max(200) })).mutation(async ({ ctx, input }) => {
      const project = await requireProject(ctx.user.id, input.projectId);
      if (!(await reserveGenerationSlot(ctx.user.id, input.projectId))) throw new Error("生成请求过于频繁或项目正在生成");
      try {
        const docs = await getProjectDocs(ctx.user.id, input.projectId); const trends = await getTrends(ctx.user.id);
        return await textFromLLM([{ role: "system", content: outlineSystemPrompt() }, { role: "user", content: `书名：${project.title}\n题材：${project.genre}\n简介：${project.synopsis}\n趋势参考：${trends.map(t => `${t.label}（${t.category}，热度${t.heat}）`).join("、")}\n世界观：${docs?.worldSetting ?? "未填写"}\n人物：${docs?.characters ?? "未填写"}\n核心冲突：${docs?.conflicts ?? "未填写"}\n故事方向：${input.direction}\n请生成${input.chapterCount}章大纲，并在开头先给出全书/本段的情绪主轴。` }]);
      } finally { await releasePersistentGenerationLock(ctx.user.id, input.projectId); }
    }),
    generateChapter: protectedProcedure.input(z.object({ projectId: z.number(), chapterId: z.number().optional(), chapterNumber: z.number().int().min(1), title: z.string().trim().min(1).max(180), outline: z.string().min(1).max(TEXT_LIMITS.outline), targetWords: z.number().int().min(500).max(20000), style: z.string().max(TEXT_LIMITS.style) })).mutation(async ({ ctx, input }) => {
      const project = await requireProject(ctx.user.id, input.projectId);
      if (!(await reserveGenerationSlot(ctx.user.id, input.projectId))) throw new Error("生成请求过于频繁或项目正在生成");
      try {
        const db = await getDb(); if (!db) throw new Error("数据库不可用"); const docs = await getProjectDocs(ctx.user.id, input.projectId);
        const body = await textFromLLM([{ role: "system", content: chapterSystemPrompt() }, { role: "user", content: `项目：${project.title}\n题材：${project.genre}\n世界观：${docs?.worldSetting ?? ""}\n人物：${docs?.characters ?? ""}\n核心冲突：${docs?.conflicts ?? ""}\n风格：${input.style}\n章节${input.chapterNumber}《${input.title}》大纲：${input.outline}\n目标字数：${input.targetWords}` }]);
        if (input.chapterId) { await requireChapter(ctx.user.id, input.projectId, input.chapterId); await db.update(chapters).set({ title: input.title, outline: input.outline, body, targetWords: input.targetWords, status: "draft" }).where(and(eq(chapters.id, input.chapterId), eq(chapters.projectId, input.projectId), eq(chapters.userId, ctx.user.id))); }
        else await db.insert(chapters).values({ projectId: input.projectId, userId: ctx.user.id, chapterNumber: input.chapterNumber, title: input.title, outline: input.outline, body, targetWords: input.targetWords, status: "draft" });
        return getChapters(ctx.user.id, input.projectId);
      } finally { await releasePersistentGenerationLock(ctx.user.id, input.projectId); }
    }),
    saveChapter: protectedProcedure.input(z.object({ id: z.number(), title: z.string().trim().min(1).max(180), outline: z.string().max(TEXT_LIMITS.outline), body: z.string().max(TEXT_LIMITS.chapterBody), targetWords: z.number().int().min(500).max(20000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用"); const chapter = (await db.select().from(chapters).where(and(eq(chapters.id, input.id), eq(chapters.userId, ctx.user.id))).limit(1))[0]; if (!chapter) throw new Error("章节不存在或无权访问"); await db.update(chapters).set({ title: input.title, outline: input.outline, body: input.body, targetWords: input.targetWords, status: "revised" }).where(and(eq(chapters.id, input.id), eq(chapters.projectId, chapter.projectId), eq(chapters.userId, ctx.user.id))); return { success: true };
    }),
    versions: protectedProcedure.input(z.object({ projectId: z.number(), entityType: z.enum(["outline", "chapter"]), entityId: z.number() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) return []; await requireEntity(ctx.user.id, input.projectId, input.entityType, input.entityId); return db.select().from(contentVersions).where(and(eq(contentVersions.projectId, input.projectId), eq(contentVersions.userId, ctx.user.id), eq(contentVersions.entityType, input.entityType), eq(contentVersions.entityId, input.entityId))).orderBy(desc(contentVersions.createdAt)); }),
    saveVersion: protectedProcedure.input(z.object({ projectId: z.number(), entityType: z.enum(["outline", "chapter"]), entityId: z.number(), label: z.string().min(1).max(160), content: z.string().min(1).max(1000000) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("数据库不可用"); await requireEntity(ctx.user.id, input.projectId, input.entityType, input.entityId); await db.insert(contentVersions).values({ ...input, userId: ctx.user.id }); return { success: true }; }),
    rollbackVersion: protectedProcedure.input(z.object({ versionId: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      const version = (await db.select().from(contentVersions).where(and(eq(contentVersions.id, input.versionId), eq(contentVersions.userId, ctx.user.id))).limit(1))[0];
      if (!version) throw new Error("版本不存在或无权访问");
      await requireVersion(ctx.user.id, version.projectId, version.entityType, version.entityId);
      if (version.entityType === "outline") await db.update(projectDocs).set({ outline: version.content }).where(and(eq(projectDocs.projectId, version.projectId), eq(projectDocs.userId, ctx.user.id)));
      else await db.update(chapters).set({ body: version.content, status: "revised" }).where(and(eq(chapters.id, version.entityId), eq(chapters.projectId, version.projectId), eq(chapters.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
  notifications: router({ list: protectedProcedure.query(({ ctx }) => getNotifications(ctx.user.id)), markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("数据库不可用"); await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id))); return { success: true }; }) }),
  schedules: router({
    list: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) return []; return db.select().from(writingSchedules).where(eq(writingSchedules.userId, ctx.user.id)); }),
    create: protectedProcedure.input(z.object({ projectId: z.number(), cronExpression: z.string().regex(/^\\d+ \\d+ \\d+ \\* \\* \\*$/).max(80), timezone: z.string().trim().min(1).max(80).default("UTC") })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用"); const project = await requireProject(ctx.user.id, input.projectId); const sessionToken = getSessionToken(ctx.req);
      return createScheduleWithCleanup({
        sessionToken,
        create: () => createHeartbeatJob({ name: `novel-forge-${project.id}`, cron: input.cronExpression, path: "/api/scheduled/continueNovel", description: `自动续写《${project.title}》` }, sessionToken),
        persist: async job => { await db.insert(writingSchedules).values({ projectId: project.id, userId: ctx.user.id, cronExpression: input.cronExpression, timezone: input.timezone, scheduleCronTaskUid: job.taskUid }); },
        remove: deleteHeartbeatJob,
      });
    }),
    setEnabled: protectedProcedure.input(z.object({ id: z.number(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      const schedule = (await db.select().from(writingSchedules).where(and(eq(writingSchedules.id, input.id), eq(writingSchedules.userId, ctx.user.id))).limit(1))[0];
      if (!schedule || !schedule.scheduleCronTaskUid) throw new Error("计划不存在或无权访问");
      await updateHeartbeatJob(schedule.scheduleCronTaskUid, { enable: input.enabled }, getSessionToken(ctx.req));
      await db.update(writingSchedules).set({ enabled: input.enabled ? 1 : 0, lockAt: null }).where(and(eq(writingSchedules.id, input.id), eq(writingSchedules.userId, ctx.user.id)));
      return { success: true, enabled: input.enabled };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      const schedule = (await db.select().from(writingSchedules).where(and(eq(writingSchedules.id, input.id), eq(writingSchedules.userId, ctx.user.id))).limit(1))[0];
      if (!schedule) throw new Error("计划不存在或无权访问");
      if (schedule.scheduleCronTaskUid) await deleteHeartbeatJob(schedule.scheduleCronTaskUid, getSessionToken(ctx.req));
      await db.delete(writingSchedules).where(and(eq(writingSchedules.id, input.id), eq(writingSchedules.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
