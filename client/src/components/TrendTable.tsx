import React, { useMemo, useState } from "react";
import { ExternalLink, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PUBLIC_TREND_OBSERVATIONS, type TrendConfidence, type TrendPlatform } from "@shared/multiPlatformTrends";

export type UserTrend = { id: number; label: string; category: string; heat: number; note?: string; source?: string; collectedAt?: string | Date; automated?: number };
export type TrendRow = {
  id: string;
  platform: TrendPlatform;
  observationType: string;
  title: string;
  genre: string;
  metricLabel: string;
  metricValue: number | null;
  confidence: TrendConfidence | "用户";
  collectedAt: string;
  sourceUrl?: string;
  source?: string;
  note: string;
  isUser?: boolean;
};

export type TrendFilters = { platform: "全部" | TrendPlatform; confidence: "全部" | TrendConfidence | "用户"; category?: string; query: string; heatThreshold: "全部" | "80" | "60" | "40"; sortBy: "heat" | "date" };

export function filterAndSortTrendRows(rows: TrendRow[], filters: TrendFilters) {
  const normalized = filters.query.trim().toLowerCase();
  return rows.filter(row => {
    const matchesPlatform = filters.platform === "全部" || row.platform === filters.platform;
    const matchesConfidence = filters.confidence === "全部" || row.confidence === filters.confidence;
    const matchesCategory = !filters.category || filters.category === "全部" || row.genre === filters.category;
    const matchesQuery = !normalized || `${row.title} ${row.genre} ${row.note}`.toLowerCase().includes(normalized);
    const matchesHeat = filters.heatThreshold === "全部" || (row.metricValue !== null && row.metricValue >= Number(filters.heatThreshold));
    return matchesPlatform && matchesConfidence && matchesCategory && matchesQuery && matchesHeat;
  }).sort((a, b) => filters.sortBy === "date" ? b.collectedAt.localeCompare(a.collectedAt) : (b.metricValue ?? -1) - (a.metricValue ?? -1));
}

function FilterSelect({ value, onChange, ariaLabel, children }: { value: string; onChange: (value: string) => void; ariaLabel: string; children: React.ReactNode }) {
  return <select aria-label={ariaLabel} value={value} onChange={event => onChange(event.target.value)} className="h-9 min-w-0 max-w-full rounded-none border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">{children}</select>;
}

function formatMetric(value: number | null, label: string) {
  if (value === null) return label;
  if (value >= 10000) return `${(value / 10000).toFixed(value % 10000 ? 1 : 0)}万 ${label}`;
  return `${value.toLocaleString()} ${label}`;
}

export function TrendTable({ trends, onEdit, onDelete }: { trends: UserTrend[]; onEdit?: (trend: UserTrend) => void; onDelete?: (trend: UserTrend) => void }) {
  const [platform, setPlatform] = useState<"全部" | TrendPlatform>("全部");
  const [confidence, setConfidence] = useState<"全部" | TrendConfidence | "用户">("全部");
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"heat" | "date">("heat");
  const [heatThreshold, setHeatThreshold] = useState<"全部" | "80" | "60" | "40">("全部");

  const rows = useMemo<TrendRow[]>(() => {
    const publicRows: TrendRow[] = PUBLIC_TREND_OBSERVATIONS.map(item => ({ ...item }));
    const userRows: TrendRow[] = trends.map(item => ({
      id: `user-${item.id}`,
      platform: "我的标签",
      observationType: "用户自定义",
      title: item.label,
      genre: item.category,
      metricLabel: "用户热度",
      metricValue: item.heat,
      confidence: "用户",
      note: item.note || "暂无备注",
      sourceUrl: item.source && item.source.startsWith("http") ? item.source : undefined,
      source: item.source ?? "本地",
      collectedAt: item.collectedAt ? new Date(item.collectedAt).toLocaleDateString("zh-CN") : "—",
      isUser: true,
    }));
    return [...publicRows, ...userRows];
  }, [trends]);

  const categories = useMemo(() => Array.from(new Set(rows.map(row => row.genre).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN")), [rows]);
  const filtered = useMemo(() => filterAndSortTrendRows(rows, { platform, confidence, category, query, heatThreshold, sortBy }), [category, confidence, heatThreshold, platform, query, rows, sortBy]);

  return <div className="space-y-4">
    <div className="flex min-w-0 flex-col gap-3 border-y border-foreground/15 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[.18em] text-muted-foreground"><SlidersHorizontal className="h-4 w-4" />筛选趋势观察</div>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
        <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索题材、标题或备注" className="w-full min-w-0 rounded-none lg:w-64" />
        <FilterSelect value={platform} onChange={value => setPlatform(value as typeof platform)} ariaLabel="平台筛选"><option value="全部">全部平台</option><option value="番茄">番茄</option><option value="抖音">抖音</option><option value="B站">B站</option><option value="我的标签">我的标签</option></FilterSelect>
        <FilterSelect value={confidence} onChange={value => setConfidence(value as typeof confidence)} ariaLabel="可信度筛选"><option value="全部">全部可信度</option><option value="高">高</option><option value="中">中</option><option value="低">低</option><option value="用户">用户标签</option></FilterSelect>
        <FilterSelect value={category} onChange={setCategory} ariaLabel="小说分类筛选"><option value="全部">全部小说分类</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</FilterSelect>
        <FilterSelect value={heatThreshold} onChange={value => setHeatThreshold(value as typeof heatThreshold)} ariaLabel="指标阈值筛选"><option value="全部">全部指标</option><option value="80">≥ 80</option><option value="60">≥ 60</option><option value="40">≥ 40</option></FilterSelect>
        <FilterSelect value={sortBy} onChange={value => setSortBy(value as typeof sortBy)} ariaLabel="趋势排序"><option value="heat">指标优先</option><option value="date">最近采集</option></FilterSelect>
      </div>
    </div>
    <div className="w-full max-w-full overflow-x-auto overscroll-x-contain border border-foreground/15">
      <Table className="min-w-[820px]">
        <TableHeader><TableRow><TableHead>平台</TableHead><TableHead>题材 / 样本</TableHead><TableHead>观察类型</TableHead><TableHead>指标</TableHead><TableHead>可信度</TableHead><TableHead>采集日期</TableHead><TableHead className="text-right">来源 / 操作</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(row => <TableRow key={row.id}>
          <TableCell><Badge variant="outline" className="rounded-none whitespace-nowrap">{row.platform}</Badge></TableCell>
          <TableCell className="min-w-[220px]"><p className="font-medium">{row.title}</p><p className="mt-1 text-xs text-muted-foreground">{row.genre}</p><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{row.note}</p></TableCell>
          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{row.observationType}</TableCell>
          <TableCell className="whitespace-nowrap text-xs">{formatMetric(row.metricValue, row.metricLabel)}</TableCell>
          <TableCell><span className={`text-xs ${row.confidence === "高" ? "text-emerald-700" : row.confidence === "低" ? "text-amber-700" : "text-muted-foreground"}`}>{row.confidence}</span></TableCell>
          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{row.collectedAt}</TableCell>
          <TableCell className="text-right"><div className="flex flex-col items-end gap-2">{row.sourceUrl ? <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-4">查看 <ExternalLink className="h-3 w-3" /></a> : <span className="text-xs text-muted-foreground">{row.source ?? "本地"}</span>}{row.isUser && <span className="flex gap-2 text-xs"><button type="button" onClick={() => onEdit?.(trends.find(item => `user-${item.id}` === row.id) ?? { id: Number(row.id.replace("user-", "")), label: row.title, category: row.genre, heat: row.metricValue ?? 0, note: row.note, source: row.source, collectedAt: row.collectedAt })} className="underline underline-offset-4">编辑</button><button type="button" onClick={() => onDelete?.(trends.find(item => `user-${item.id}` === row.id) ?? { id: Number(row.id.replace("user-", "")), label: row.title, category: row.genre, heat: row.metricValue ?? 0, note: row.note, source: row.source, collectedAt: row.collectedAt })} className="text-destructive underline underline-offset-4">删除</button></span>}</div></TableCell>
        </TableRow>)}{filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">没有符合当前筛选条件的趋势观察。</TableCell></TableRow>}</TableBody>
      </Table>
    </div>
    <p className="text-xs leading-6 text-muted-foreground">当前显示 {filtered.length} 条观察。平台公开推荐和搜索结果仅作为选题参考，不代表实时全量榜单、销量结论或平台推荐保证。</p>
  </div>;
}
