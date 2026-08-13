import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";

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
