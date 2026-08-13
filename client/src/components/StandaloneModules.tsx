import React from "react";
import { BookOpen, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendTable } from "@/components/TrendTable";
import { MULTI_PLATFORM_TREND_SOURCES } from "@shared/multiPlatformTrends";

export function StandaloneTrendPanel({ trends }: { trends: any[] }) {
  return <Card className="rounded-none motion-rise"><CardHeader><CardTitle className="font-display text-3xl">题材趋势库</CardTitle><p className="text-sm text-muted-foreground leading-6">把公开平台的题材观察和你的自定义标签放在同一张表里，方便按平台、题材和可信度比较。</p></CardHeader><CardContent><div className="mb-6 border-l-2 border-accent pl-4 text-xs leading-6 text-muted-foreground"><strong className="text-foreground">多平台公开观察 · 采集于 2026-08-13</strong><br />番茄记录公开分类与首页观察；抖音记录公开搜索主题；B站记录公开视频搜索结果。三者均不是实时全量榜单。<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{MULTI_PLATFORM_TREND_SOURCES.map(source => <a key={source.platform} className="underline underline-offset-4" href={source.url} target="_blank" rel="noreferrer">查看 {source.platform} 来源</a>)}</div></div><TrendTable trends={trends} /></CardContent></Card>;
}

export function StandaloneModulePanel({ target, onCreate }: { target: string; onCreate: () => void }) {
  const title = target === "versions" ? "版本档案" : target === "schedule" ? "续写计划" : "创作工作台";
  const description = target === "versions" ? "版本档案会按小说项目归档。请先建立或选择一部小说。" : target === "schedule" ? "续写现在由你在正文编辑中手动触发 AI。请先建立或选择一部小说。" : "先建立一部小说，再进入创作工作台。";
  return <div className="empty-manuscript min-h-[420px] border border-dashed border-foreground/25 p-6 md:p-10 motion-rise"><div className="empty-manuscript__top"><span className="folio-stamp">NF</span><span className="font-mono text-[10px] tracking-[.18em] text-muted-foreground">{title.toUpperCase()}</span><span className="empty-manuscript__rule" /></div><div className="empty-manuscript__body"><div className="text-center"><BookOpen className="mx-auto h-9 w-9 mb-5" strokeWidth={1.5} /><h2 className="font-display text-3xl md:text-4xl mb-3">{title}</h2><p className="max-w-md text-muted-foreground leading-7 mb-7">{description}</p><Button onClick={onCreate} className="rounded-none"><Plus className="mr-2 h-4 w-4" />建立首个项目</Button></div></div></div>;
}
