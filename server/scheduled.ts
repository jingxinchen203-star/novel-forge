import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { users, trendTags, trendRefreshRuns } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { ENV } from "./_core/env";

export function normalizeContent(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(part =>
        typeof part === "object" && part && "text" in part
          ? String((part as { text?: unknown }).text ?? "")
          : ""
      )
      .join("");
  }
  return "";
}

/**
 * Legacy Heartbeat endpoint. Continuation is intentionally manual-only now;
 * historical callbacks acknowledge without invoking the LLM or mutating data.
 */
type TrendRefreshItem = {
  label?: unknown;
  category?: unknown;
  heat?: unknown;
  note?: unknown;
  source?: unknown;
  collectedAt?: unknown;
};

export async function runScheduledTrendRefresh(req: Request, res: Response) {
  let runId = 0;
  let historyDb: Awaited<ReturnType<typeof getDb>> = null;
  try {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(403).json({ error: "cron-only" });
    }
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const body = req.body as { items?: TrendRefreshItem[] } | undefined;
    const items = Array.isArray(body?.items) ? body.items.slice(0, 40) : [];
    if (!items.length) return res.status(400).json({ error: "trend_items_required" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "database_unavailable" });
    historyDb = db;
    const owner = (await db.select({ id: users.id }).from(users).where(eq(users.openId, ENV.ownerOpenId)).limit(1))[0];
    if (!owner) return res.json({ ok: true, skipped: "owner_not_found" });
    const runInsert = await db.insert(trendRefreshRuns).values({ userId: owner.id, taskUid: user.taskUid, trigger: "scheduled", status: "running", startedAt: new Date() });
    runId = Number((runInsert as any)[0]?.insertId ?? 0);
    if (!items.length) {
      if (runId) await db.update(trendRefreshRuns).set({ status: "failed", error: "trend_items_required", finishedAt: new Date() }).where(eq(trendRefreshRuns.id, runId));
      return res.status(400).json({ error: "trend_items_required" });
    }
    const normalized = items.map(item => ({
      userId: owner.id,
      label: String(item.label ?? "").trim().slice(0, 80),
      category: String(item.category ?? "综合").trim().slice(0, 80),
      heat: Math.max(0, Math.min(100, Number(item.heat) || 0)),
      note: String(item.note ?? "").trim().slice(0, 4000),
      source: String(item.source ?? "公开趋势研究").trim().slice(0, 180),
      collectedAt: item.collectedAt ? new Date(String(item.collectedAt)) : new Date(),
      automated: 1,
    })).filter(item => item.label && item.note && !Number.isNaN(item.collectedAt.getTime()));
    if (!normalized.length) {
      if (runId) await db.update(trendRefreshRuns).set({ status: "failed", error: "valid_trend_items_required", finishedAt: new Date() }).where(eq(trendRefreshRuns.id, runId));
      return res.status(400).json({ error: "valid_trend_items_required" });
    }
    await db.delete(trendTags).where(and(eq(trendTags.userId, owner.id), eq(trendTags.automated, 1)));
    await db.insert(trendTags).values(normalized);
    if (runId) await db.update(trendRefreshRuns).set({ status: "succeeded", itemCount: normalized.length, finishedAt: new Date() }).where(eq(trendRefreshRuns.id, runId));
    return res.json({ ok: true, taskUid: user.taskUid, refreshed: normalized.length });
  } catch (error) {
    if (runId && historyDb) await historyDb.update(trendRefreshRuns).set({ status: "failed", error: String(error).slice(0, 4000), finishedAt: new Date() }).where(eq(trendRefreshRuns.id, runId));
    console.error("[ScheduledTrendRefresh] failed", error);
    return res.status(500).json({ error: "scheduled_trend_refresh_failed" });
  }
}

export async function runScheduledContinuation(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    return res.json({ ok: true, skipped: "manual-only" });
  } catch {
    return res.status(500).json({ error: "scheduled_continuation_failed" });
  }
}
