import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { createHeartbeatJob } from "./_core/heartbeat";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { and, desc, eq } from "drizzle-orm";
import { getDb, getProject, getProjectDocs, getProjects, getChapters, getTrends, getNotifications, chapters, contentVersions, novelProjects, notifications, projectDocs, trendTags, writingSchedules } from "./db";
import { buildOhStorySystemPrompt, OH_STORY_METHOD } from "@shared/ohStoryMethod";

const projectInput = z.object({ title: z.string().min(1), genre: z.string().min(1), synopsis: z.string().default(""), targetWords: z.number().int().min(1000).max(500000) });

async function requireProject(userId: number, id: number) {
  const project = await getProject(userId, id);
  if (!project) throw new Error("项目不存在或无权访问");
  return project;
}

export function outlineSystemPrompt() {
  return buildOhStorySystemPrompt("你是资深网文总编。请输出清晰、可执行的章节大纲，包含章节号、标题、核心事件、冲突升级和章末钩子。不要复述指令。", OH_STORY_METHOD.outlinePrompt);
}

export function chapterSystemPrompt() {
  return buildOhStorySystemPrompt("你是成熟的中文网文作者。保持人物一致、叙事流畅、段落适合移动端阅读，严格围绕章节大纲推进，不要输出标题以外的解释。", OH_STORY_METHOD.prosePrompt);
}

async function textFromLLM(messages: { role: "system" | "user"; content: string }[]) {
  const result = await invokeLLM({ model: "gpt-5-mini", messages });
  const content = result.choices[0]?.message?.content;
  if (typeof content === "string") return content;
  return Array.isArray(content) ? content.map(part => "text" in part ? part.text : "").join("") : "";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
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
      await db.delete(novelProjects).where(and(eq(novelProjects.id, input.id), eq(novelProjects.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
  trends: router({
    list: protectedProcedure.query(({ ctx }) => getTrends(ctx.user.id)),
    create: protectedProcedure.input(z.object({ label: z.string().min(1), category: z.string().min(1), heat: z.number().int().min(0).max(100), note: z.string().default("") })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      await db.insert(trendTags).values({ ...input, userId: ctx.user.id }); return getTrends(ctx.user.id);
    }),
    update: protectedProcedure.input(z.object({ id: z.number(), label: z.string().min(1), category: z.string().min(1), heat: z.number().int().min(0).max(100), note: z.string().default("") })).mutation(async ({ ctx, input }) => {
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
    saveDocs: protectedProcedure.input(z.object({ projectId: z.number(), outline: z.string().optional(), worldSetting: z.string(), characters: z.string(), conflicts: z.string(), styleGuide: z.string() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用"); await requireProject(ctx.user.id, input.projectId);
      const existing = await getProjectDocs(ctx.user.id, input.projectId);
      if (existing) await db.update(projectDocs).set(input).where(eq(projectDocs.id, existing.id));
      else await db.insert(projectDocs).values({ ...input, userId: ctx.user.id });
      return getProjectDocs(ctx.user.id, input.projectId);
    }),
    generateOutline: protectedProcedure.input(z.object({ projectId: z.number(), direction: z.string(), chapterCount: z.number().int().min(3).max(200) })).mutation(async ({ ctx, input }) => {
      const project = await requireProject(ctx.user.id, input.projectId); const docs = await getProjectDocs(ctx.user.id, input.projectId); const trends = await getTrends(ctx.user.id);
      return textFromLLM([{ role: "system", content: outlineSystemPrompt() }, { role: "user", content: `书名：${project.title}\n题材：${project.genre}\n简介：${project.synopsis}\n趋势参考：${trends.map(t => `${t.label}（${t.category}，热度${t.heat}）`).join("、")}\n世界观：${docs?.worldSetting ?? "未填写"}\n人物：${docs?.characters ?? "未填写"}\n核心冲突：${docs?.conflicts ?? "未填写"}\n故事方向：${input.direction}\n请生成${input.chapterCount}章大纲，并在开头先给出全书/本段的情绪主轴。` }]);
    }),
    generateChapter: protectedProcedure.input(z.object({ projectId: z.number(), chapterId: z.number().optional(), chapterNumber: z.number().int().min(1), title: z.string(), outline: z.string(), targetWords: z.number().int().min(500).max(20000), style: z.string() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用"); const project = await requireProject(ctx.user.id, input.projectId); const docs = await getProjectDocs(ctx.user.id, input.projectId);
      const body = await textFromLLM([{ role: "system", content: chapterSystemPrompt() }, { role: "user", content: `项目：${project.title}\n题材：${project.genre}\n世界观：${docs?.worldSetting ?? ""}\n人物：${docs?.characters ?? ""}\n核心冲突：${docs?.conflicts ?? ""}\n风格：${input.style}\n章节${input.chapterNumber}《${input.title}》大纲：${input.outline}\n目标字数：${input.targetWords}` }]);
      if (input.chapterId) await db.update(chapters).set({ title: input.title, outline: input.outline, body, targetWords: input.targetWords, status: "draft" }).where(and(eq(chapters.id, input.chapterId), eq(chapters.userId, ctx.user.id)));
      else await db.insert(chapters).values({ projectId: input.projectId, userId: ctx.user.id, chapterNumber: input.chapterNumber, title: input.title, outline: input.outline, body, targetWords: input.targetWords, status: "draft" });
      return getChapters(ctx.user.id, input.projectId);
    }),
    saveChapter: protectedProcedure.input(z.object({ id: z.number(), title: z.string(), outline: z.string(), body: z.string(), targetWords: z.number().int().min(500) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用"); await db.update(chapters).set({ title: input.title, outline: input.outline, body: input.body, targetWords: input.targetWords, status: "revised" }).where(and(eq(chapters.id, input.id), eq(chapters.userId, ctx.user.id))); return { success: true };
    }),
    versions: protectedProcedure.input(z.object({ projectId: z.number(), entityType: z.enum(["outline", "chapter"]), entityId: z.number() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) return []; return db.select().from(contentVersions).where(and(eq(contentVersions.projectId, input.projectId), eq(contentVersions.userId, ctx.user.id), eq(contentVersions.entityType, input.entityType), eq(contentVersions.entityId, input.entityId))).orderBy(desc(contentVersions.createdAt)); }),
    saveVersion: protectedProcedure.input(z.object({ projectId: z.number(), entityType: z.enum(["outline", "chapter"]), entityId: z.number(), label: z.string(), content: z.string() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("数据库不可用"); await db.insert(contentVersions).values({ ...input, userId: ctx.user.id }); return { success: true }; }),
    rollbackVersion: protectedProcedure.input(z.object({ versionId: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用");
      const version = (await db.select().from(contentVersions).where(and(eq(contentVersions.id, input.versionId), eq(contentVersions.userId, ctx.user.id))).limit(1))[0];
      if (!version) throw new Error("版本不存在或无权访问");
      if (version.entityType === "outline") await db.update(projectDocs).set({ outline: version.content }).where(and(eq(projectDocs.projectId, version.projectId), eq(projectDocs.userId, ctx.user.id)));
      else await db.update(chapters).set({ body: version.content, status: "revised" }).where(and(eq(chapters.id, version.entityId), eq(chapters.projectId, version.projectId), eq(chapters.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
  notifications: router({ list: protectedProcedure.query(({ ctx }) => getNotifications(ctx.user.id)), markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("数据库不可用"); await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id))); return { success: true }; }) }),
  schedules: router({
    list: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) return []; return db.select().from(writingSchedules).where(eq(writingSchedules.userId, ctx.user.id)); }),
    create: protectedProcedure.input(z.object({ projectId: z.number(), cronExpression: z.string().regex(/^\\d+ \\d+ \\d+ \\* \\* \\*$/), timezone: z.string().default("UTC") })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("数据库不可用"); const project = await requireProject(ctx.user.id, input.projectId); const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const job = await createHeartbeatJob({ name: `novel-forge-${project.id}`, cron: input.cronExpression, path: "/api/scheduled/continueNovel", description: `自动续写《${project.title}》` }, sessionToken);
      await db.insert(writingSchedules).values({ projectId: project.id, userId: ctx.user.id, cronExpression: input.cronExpression, timezone: input.timezone, scheduleCronTaskUid: job.taskUid });
      return job;
    }),
  }),
});

export type AppRouter = typeof appRouter;
