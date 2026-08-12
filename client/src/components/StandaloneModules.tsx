import React from "react";
import { BookOpen, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FANQIE_TREND_SAMPLES, FANQIE_TREND_SOURCE } from "@shared/fanqieTrends";

export function StandaloneTrendPanel({ trends }: { trends: any[] }) {
  return <Card className="rounded-none motion-rise"><CardHeader><CardTitle className="font-display text-3xl">题材趋势库</CardTitle><p className="text-sm text-muted-foreground leading-6">即使还没有小说项目，也可以先观察公开趋势样本，再决定书名和创作方向。</p></CardHeader><CardContent><div className="mb-6 border-l-2 border-accent pl-4 text-xs leading-6 text-muted-foreground"><strong className="text-foreground">公开趋势观察样本 · {FANQIE_TREND_SOURCE.collectedAt}</strong><br />{FANQIE_TREND_SOURCE.methodology} <a className="underline underline-offset-4" href={FANQIE_TREND_SOURCE.url} target="_blank" rel="noreferrer">查看番茄公开页面</a></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{FANQIE_TREND_SAMPLES.map(trend => <div key={trend.label} className="border border-accent/40 bg-accent/5 p-4"><div className="flex justify-between"><span className="font-semibold">{trend.label}</span><span className="text-[10px] uppercase tracking-[.16em] text-accent">公开样本</span></div><p className="text-xs text-muted-foreground mt-2">{trend.category} · 观察热度 {trend.heat}</p><p className="text-xs leading-6 mt-3">{trend.note}</p></div>)}{trends.map(trend => <div key={trend.id} className="border p-4"><span className="font-semibold">{trend.label}</span><p className="text-xs text-muted-foreground mt-2">{trend.category} · 用户标签热度 {trend.heat}</p><p className="text-xs leading-6 mt-3">{trend.note || "暂无备注"}</p></div>)}</div></CardContent></Card>;
}

export function StandaloneModulePanel({ target, onCreate }: { target: string; onCreate: () => void }) {
  const title = target === "versions" ? "版本档案" : target === "schedule" ? "续写计划" : "创作工作台";
  const description = target === "versions" ? "版本档案会按小说项目归档。请先建立或选择一部小说。" : target === "schedule" ? "自动续写计划需要绑定具体小说项目。请先建立或选择一部小说。" : "先建立一部小说，再进入创作工作台。";
  return <div className="empty-manuscript min-h-[420px] border border-dashed border-foreground/25 p-6 md:p-10 motion-rise"><div className="empty-manuscript__top"><span className="folio-stamp">NF</span><span className="font-mono text-[10px] tracking-[.18em] text-muted-foreground">{title.toUpperCase()}</span><span className="empty-manuscript__rule" /></div><div className="empty-manuscript__body"><div className="text-center"><BookOpen className="mx-auto h-9 w-9 mb-5" strokeWidth={1.5} /><h2 className="font-display text-3xl md:text-4xl mb-3">{title}</h2><p className="max-w-md text-muted-foreground leading-7 mb-7">{description}</p><Button onClick={onCreate} className="rounded-none"><Plus className="mr-2 h-4 w-4" />建立首个项目</Button></div></div></div>;
}
