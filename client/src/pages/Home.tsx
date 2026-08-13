import React, { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  Download,
  FileDown,
  FolderPlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  Check,
  Copy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  currentHash,
  currentProjectId,
  lastProjectId,
  projectNavigationUrl,
  rememberProjectId,
  readNavTarget,
  resolveProjectSelection,
  targetAnchor,
  targetToWorkspaceTab,
} from "@/lib/navigation";
import {
  StandaloneModulePanel,
  StandaloneTrendPanel,
} from "@/components/StandaloneModules";
import { TrendTable } from "@/components/TrendTable";
import { GenrePicker } from "@/components/GenrePicker";
import { SynopsisFields } from "@/components/SynopsisFields";
import { canSaveProject } from "@shared/projectValidation";
import { buildProjectCreateInput } from "@shared/projectForm";
import { countWritingUnits, writingGoalProgress } from "@shared/writingStats";
import {
  canGenerateOutline,
  normalizeStoryDirection,
} from "@shared/storyDirection";

const emptyProject = {
  title: "",
  genre: "",
  synopsis: "",
  targetWords: 100000,
};
const emptyDocs = {
  outline: "",
  worldSetting: "",
  characters: "",
  conflicts: "",
  styleGuide: "克制、细腻、具有连续追读钩子的中文网文叙事。",
};

function writingDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readWritingPreference(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeWritingPreference(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(Math.max(0, Math.round(value))));
  } catch {
    // Blocked storage should not prevent writing.
  }
}

function getDraftKey(projectId: number, chapterId: number) {
  return `novel-forge:draft:${projectId}:${chapterId}`;
}

function readChapterDraft(projectId: number, chapterId: number) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getDraftKey(projectId, chapterId));
    return raw ? JSON.parse(raw) as { title: string; outline: string; body: string; targetWords: number; updatedAt: number } : null;
  } catch {
    return null;
  }
}

function writeChapterDraft(projectId: number, chapterId: number, draft: { title: string; outline: string; body: string; targetWords: number }) {
  try {
    window.localStorage.setItem(getDraftKey(projectId, chapterId), JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {
    // Offline or blocked storage should not interrupt writing.
  }
}

type DiffSegment = { text: string; kind: "same" | "added" | "removed" };

function diffTokens(value: string) {
  return value.match(/[\\u4e00-\\u9fff]|[A-Za-z0-9_]+|\\s+|[^\\s\\w]/g) ?? [];
}

function buildTextDiff(original: string, revised: string): DiffSegment[] {
  const left = diffTokens(original).slice(0, 1200);
  const right = diffTokens(revised).slice(0, 1200);
  const rows = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i -= 1) for (let j = right.length - 1; j >= 0; j -= 1) rows[i][j] = left[i] === right[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
  const segments: DiffSegment[] = [];
  const push = (text: string, kind: DiffSegment["kind"]) => { if (!text) return; const last = segments.at(-1); if (last?.kind === kind) last.text += text; else segments.push({ text, kind }); };
  let i = 0; let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { push(left[i], "same"); i += 1; j += 1; }
    else if (rows[i + 1][j] >= rows[i][j + 1]) { push(left[i], "removed"); i += 1; }
    else { push(right[j], "added"); j += 1; }
  }
  while (i < left.length) { push(left[i], "removed"); i += 1; }
  while (j < right.length) { push(right[j], "added"); j += 1; }
  return segments;
}

function DiffHighlightedText({ original, revised, ariaLabel, filter = "all" }: { original: string; revised: string; ariaLabel: string; filter?: "all" | "added" | "removed" }) {
  const segments = buildTextDiff(original, revised).filter(segment => filter === "all" || segment.kind === "same" || segment.kind === filter);
  return <div aria-label={ariaLabel} className="min-h-36 whitespace-pre-wrap rounded-none border border-border bg-background p-3 text-[16px] leading-7" role="region">{segments.length ? segments.map((segment, index) => <span key={`${segment.kind}-${index}`} className={segment.kind === "added" ? "bg-emerald-200/70 text-emerald-950 underline decoration-emerald-700 decoration-2 underline-offset-2 dark:bg-emerald-900/60 dark:text-emerald-100" : segment.kind === "removed" ? "bg-rose-200/70 text-rose-950 line-through decoration-rose-700 dark:bg-rose-900/60 dark:text-rose-100" : ""}>{segment.text}</span>) : "暂无差异"}</div>;
}

function getMutationErrorMessage(error: { message?: string }) {
  const message = error.message ?? "";
  if (message.includes("ai_generation_failed")) {
    return "AI 暂时无法生成，请稍后重试；当前编辑内容没有被覆盖。";
  }
  if (message.includes("生成请求过于频繁") || message.includes("项目正在生成")) {
    return "当前项目正在生成或请求过于频繁，请稍后再试。";
  }
  if (message.includes("UNAUTHORIZED") || message.includes("未登录")) {
    return "登录状态已失效，请重新登录后再继续。";
  }
  return message || "操作未完成，请稍后重试。";
}

export default function Home() {
  const utils = trpc.useUtils();
  const projects = trpc.projects.list.useQuery();
  const trends = trpc.trends.list.useQuery();
  const trendRuns = (trpc.trends as any).runs?.useQuery ? (trpc.trends as any).runs.useQuery() : { data: [] };
  const refreshTrends = (trpc.trends as any).refresh?.useMutation ? (trpc.trends as any).refresh.useMutation({ onSuccess: () => { utils.trends.list.invalidate(); (utils.trends as any).runs?.invalidate?.(); toast.success("趋势研究已更新"); }, onError: (error: any) => toast.error(getMutationErrorMessage(error)) }) : { mutate: () => undefined, isPending: false };
  const notifications = trpc.notifications.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    currentProjectId() ?? lastProjectId()
  );
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [synopsisIdea, setSynopsisIdea] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(() =>
    readNavTarget(currentHash())
  );
  const [showReleaseNotice, setShowReleaseNotice] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("novel-forge:release:v1.0.0") !== "seen"; } catch { return true; }
  });
  const dismissReleaseNotice = () => {
    try { window.localStorage.setItem("novel-forge:release:v1.0.0", "seen"); } catch {}
    setShowReleaseNotice(false);
  };
  useEffect(() => {
    if (!projects.data) return;
    const nextId = resolveProjectSelection(
      projects.data.map(project => project.id),
      selectedId
    );
    if (nextId !== selectedId) {
      setSelectedId(nextId);
      rememberProjectId(nextId);
      if (nextId && typeof window !== "undefined")
        window.history.replaceState(
          null,
          "",
          projectNavigationUrl(nextId, readNavTarget(currentHash()))
        );
    }
  }, [projects.data, selectedId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHashChange = () => {
      const target = readNavTarget(currentHash());
      setNavigationTarget(target);
      const anchor = targetAnchor(target);
      if (anchor && typeof document !== "undefined")
        window.setTimeout(
          () =>
            document
              .getElementById(anchor)
              ?.scrollIntoView({ behavior: "smooth", block: "start" }),
          0
        );
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const handleSelectProject = (projectId: number) => {
    setSelectedId(projectId);
    rememberProjectId(projectId);
    setShowNew(false);
    setSelectedNotification(null);
    setNavigationTarget("workspace");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", projectNavigationUrl(projectId));
      window.setTimeout(
        () =>
          document
            .getElementById("novel-forge-workspace")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        0
      );
    }
  };
  const selected = projects.data?.find(p => p.id === selectedId) ?? null;
  const workspace = trpc.workspace.get.useQuery(
    { projectId: selectedId ?? 0 },
    { enabled: Boolean(selectedId) }
  );
  const create = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      setShowNew(false);
      setProjectForm(emptyProject);
      setSynopsisIdea("");
      toast.success("项目已建立");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const optimizeSynopsis = trpc.projects.optimizeSynopsis.useMutation({
    onSuccess: value => {
      setProjectForm(current => ({ ...current, synopsis: value }));
      toast.success("简介已优化，可继续修改");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const remove = trpc.projects.remove.useMutation({
    onSuccess: () => {
      setSelectedId(null);
      rememberProjectId(null);
      utils.projects.list.invalidate();
      toast.success("项目已移除");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const markNotification = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const unread = notifications.data?.filter(n => !n.readAt).length ?? 0;
  const wordCount = useMemo(
    () =>
      workspace.data?.chapters.reduce((sum, c) => sum + c.body.length, 0) ?? 0,
    [workspace.data]
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] editorial-grid px-5 py-8 md:px-10 md:py-12">
      {showReleaseNotice && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/35 p-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="release-notice-title"><Card className="w-full max-w-2xl rounded-none border-foreground/20 bg-background shadow-2xl"><CardHeader className="border-b border-foreground/10"><div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] uppercase tracking-[.22em] text-accent">Novel Forge / Release v1.0.0</p><CardTitle id="release-notice-title" className="font-display text-3xl leading-tight">让故事先成形，再成为作品。</CardTitle></div><Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="关闭版本更新提示" onClick={dismissReleaseNotice}><X className="h-4 w-4" /></Button></div></CardHeader><CardContent className="space-y-5 p-5 md:p-7"><p className="text-sm leading-7 text-muted-foreground">欢迎使用 v1.0.0。本次更新把创作、审校、备份和趋势研究整理成一套更可靠的编辑室流程。</p><div className="grid gap-3 md:grid-cols-2"><div className="border border-foreground/10 p-4"><p className="font-semibold">编辑室创作</p><p className="mt-2 text-sm leading-6 text-muted-foreground">章节大纲、世界与人物、正文编辑和手动 AI 续写集中在同一工作台。</p></div><div className="border border-foreground/10 p-4"><p className="font-semibold">AI 审校辅助</p><p className="mt-2 text-sm leading-6 text-muted-foreground">支持润色、名字、剧情灵感，以及原文与结果的差异高亮和筛选。</p></div><div className="border border-foreground/10 p-4"><p className="font-semibold">可靠保存</p><p className="mt-2 text-sm leading-6 text-muted-foreground">本机自动保存、离线恢复、项目导出和服务端草稿备份共同保护写作进度。</p></div><div className="border border-foreground/10 p-4"><p className="font-semibold">趋势与归档</p><p className="mt-2 text-sm leading-6 text-muted-foreground">多平台题材趋势、刷新历史、失败重试、版本档案和暗黑模式已整合。</p></div></div><Button type="button" className="min-h-11 w-full rounded-none" onClick={dismissReleaseNotice}>开始创作</Button></CardContent></Card></div>}
      <div className="mx-auto max-w-[1480px]">
        <header
          id="novel-forge-overview"
          className="scroll-mt-20 mb-16 motion-rise"
        >
          <div className="studio-hero">
            <div className="studio-hero__main">
              <div className="studio-kicker">
                <span>Novel Forge / Editorial Studio</span>
                <span className="studio-kicker__line" />
                <span>Issue 01 · 2026</span>
              </div>
              <div className="studio-hero__title-wrap">
                <span className="studio-hero__index">01</span>
                <h1 className="studio-hero__title">
                  <span className="studio-hero__title-line">让故事</span>
                  <span className="studio-hero__title-line studio-hero__title-line--accent">先成形，</span>
                  <span className="studio-hero__title-line">再成为作品。</span>
                </h1>
              </div>
              <p className="studio-hero__dek">
                一间为长篇小说准备的数字编辑室。把灵感变成结构，把结构推进成章节；AI 负责提案，你保留最后的判断。
              </p>
            </div>
            <div className="studio-hero__side">
              <div className="studio-loop">
                <div className="studio-loop__head">
                  <span>EDITORIAL LOOP</span>
                  <span>工作方式</span>
                </div>
                <div className="studio-loop__steps">
                  <div className="studio-loop__step">
                    <span>01</span>
                    <div><strong>先收集</strong><small>书名、题材、故事抓手</small></div>
                  </div>
                  <div className="studio-loop__step">
                    <span>02</span>
                    <div><strong>再组织</strong><small>世界、人物、冲突与章节</small></div>
                  </div>
                  <div className="studio-loop__step">
                    <span>03</span>
                    <div><strong>逐章推进</strong><small>AI 起草，你审核、修改、归档</small></div>
                  </div>
                </div>
              </div>
              <div className="studio-hero__stats">
                <div><strong>{projects.data?.length ?? 0}</strong><span>作品档案</span></div>
                <div><strong>{unread}</strong><span>未读提醒</span></div>
                <div><strong>AI</strong><span>辅助提案</span></div>
              </div>
            </div>
          </div>
          {notifications.data?.length ? (
            <div className="studio-notifications">
              <span className="studio-notifications__label">NOTES / 最新批注</span>
              <div className="studio-notifications__items">
                {notifications.data.slice(0, 2).map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNotification(n);
                      if (n.projectId) setSelectedId(n.projectId);
                      markNotification.mutate({ id: n.id });
                    }}
                    className="studio-notifications__item"
                  >
                    <span>{n.title}</span><small>{n.message}{!n.readAt && " · 未读"}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {selectedNotification && (
            <Card className="mt-5 rounded-none">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[.2em] text-muted-foreground">通知详情</p>
                    <p className="font-display text-lg mt-2">{selectedNotification.title}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-6">{selectedNotification.message}</p>
                  </div>
                  <button className="text-xs text-muted-foreground" onClick={() => setSelectedNotification(null)}>关闭</button>
                </div>
                {selectedNotification.projectId && <p className="text-xs text-accent mt-3">已定位到关联小说项目</p>}
              </CardContent>
            </Card>
          )}
        </header>
        <section
          id="novel-forge-workspace"
          className="scroll-mt-20 grid gap-6 xl:grid-cols-[300px_1fr] items-start"
        >
          <aside className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[.3em] text-muted-foreground">
                  Your projects
                </p>
                <h2 className="font-display text-2xl mt-1">小说项目</h2>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="rounded-none"
                onClick={() => setShowNew(true)}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {projects.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : projects.data?.length ? (
                projects.data.map(project => (
                  <a
                    href="#workspace"
                    key={project.id}
                    aria-current={
                      selectedId === project.id ? "page" : undefined
                    }
                    aria-label={`打开项目：${project.title}`}
                    onClick={() => handleSelectProject(project.id)}
                    className={`group block w-full cursor-pointer p-4 text-left border transition-all ${selectedId === project.id ? "bg-[#171613] text-[#f5f1e9] border-[#171613]" : "bg-background/50 hover:bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-display text-lg leading-tight">
                        {project.title}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 mt-1" />
                    </div>
                    <div
                      className={`mt-5 flex justify-between text-[10px] uppercase tracking-[.18em] ${selectedId === project.id ? "text-[#f5f1e9]/60" : "text-muted-foreground"}`}
                    >
                      <span>{project.genre}</span>
                      <span>{project.status}</span>
                    </div>
                    <span
                      className={`mt-3 block text-[10px] uppercase tracking-[.16em] ${selectedId === project.id ? "text-[#f5f1e9]/60" : "text-muted-foreground"}`}
                    >
                      打开工作台 →
                    </span>
                  </a>
                ))
              ) : (
                <div className="border border-dashed p-6 text-sm text-muted-foreground leading-6">
                  还没有项目。先建立一部小说，让这间编辑室有第一份档案。
                </div>
              )}
            </div>
          </aside>
          <main className="min-w-0">
            {showNew && (
              <Card className="rounded-none border-foreground/20 mb-6 motion-rise">
                <CardHeader>
                  <CardTitle className="font-display text-2xl">
                    建立新的作品档案
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="书名"
                    value={projectForm.title}
                    onChange={e =>
                      setProjectForm({ ...projectForm, title: e.target.value })
                    }
                  />
                  <GenrePicker
                    value={projectForm.genre}
                    onChange={genre =>
                      setProjectForm({ ...projectForm, genre })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="目标字数"
                    value={projectForm.targetWords}
                    onChange={e =>
                      setProjectForm({
                        ...projectForm,
                        targetWords: Number(e.target.value),
                      })
                    }
                  />
                  <SynopsisFields
                    idea={synopsisIdea}
                    synopsis={projectForm.synopsis}
                    onIdeaChange={setSynopsisIdea}
                    onSynopsisChange={synopsis =>
                      setProjectForm({ ...projectForm, synopsis })
                    }
                  />
                  <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      disabled={
                        !synopsisIdea.trim() || optimizeSynopsis.isPending
                      }
                      onClick={() =>
                        optimizeSynopsis.mutate({
                          title: projectForm.title,
                          genre: projectForm.genre,
                          idea: synopsisIdea,
                        })
                      }
                    >
                      {optimizeSynopsis.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      AI 优化简介
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      先输入粗略想法，再由 AI 整理成可发布简介。
                    </span>
                  </div>
                  <div className="md:col-span-2 flex gap-3">
                    <Button
                      className="rounded-none"
                      disabled={
                        !canSaveProject(projectForm.title, projectForm.genre) ||
                        create.isPending
                      }
                      onClick={() =>
                        create.mutate(buildProjectCreateInput(projectForm))
                      }
                    >
                      {create.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      保存项目
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-none"
                      onClick={() => setShowNew(false)}
                    >
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {!selected ? (
              navigationTarget === "trends" ? (
                <StandaloneTrendPanel trends={trends.data ?? []} runs={trendRuns.data ?? []} onRefresh={() => refreshTrends.mutate()} refreshing={refreshTrends.isPending} />
              ) : (
                <StandaloneModulePanel
                  target={navigationTarget}
                  onCreate={() => setShowNew(true)}
                />
              )
            ) : navigationTarget === "trends" || navigationTarget === "versions" || navigationTarget === "schedule" ? (
              <ProjectModulePage
                target={navigationTarget}
                project={selected}
                trends={trends.data ?? []}
              />
            ) : (
              <ProjectWorkspace
                project={selected}
                workspace={workspace.data}
                trends={trends.data ?? []}
                wordCount={wordCount}
                navigationTarget={navigationTarget}
                onDelete={() => remove.mutate({ id: selected.id })}
              />
            )}
          </main>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty-manuscript min-h-[420px] border border-dashed border-foreground/25 p-6 md:p-10">
      <div className="empty-manuscript__top">
        <span className="folio-stamp">NF</span>
        <span className="font-mono text-[10px] tracking-[.18em] text-muted-foreground">
          ARCHIVE / 000
        </span>
        <span className="empty-manuscript__rule" />
      </div>
      <div className="empty-manuscript__body">
        <div className="empty-manuscript__index">
          <span>EDITORIAL NOTE</span>
          <b>01</b>
          <i>—</i>
          <small>New manuscript</small>
        </div>
        <div className="text-center">
          <BookOpen className="mx-auto h-9 w-9 mb-5" strokeWidth={1.5} />
          <h2 className="font-display text-3xl md:text-4xl mb-3">
            选择一部作品开始工作
          </h2>
          <p className="max-w-md text-muted-foreground leading-7 mb-7">
            从一个书名和一句故事抓手开始，世界观、人物、章节和版本会在这里逐步成形。
          </p>
          <Button onClick={onCreate} className="rounded-none">
            <Plus className="mr-2 h-4 w-4" />
            建立首个项目
          </Button>
        </div>
      </div>
      <div className="empty-manuscript__footer">
        <span>Novel Forge Editorial Studio</span>
        <span>AI 负责推进 · 作者负责判断</span>
      </div>
    </div>
  );
}

function ProjectModulePage({
  target,
  project,
  trends,
}: {
  target: string;
  project: any;
  trends: any[];
}) {
  const versions = trpc.workspace.versions.useQuery({
    projectId: project.id,
    entityType: "outline",
    entityId: 0,
  });
  const schedules = trpc.schedules.list.useQuery();
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const title = target === "trends" ? "题材趋势库" : target === "versions" ? "版本档案" : "续写计划";
  const eyebrow = target === "trends" ? "RESEARCH / 题材观察" : target === "versions" ? "ARCHIVE / 版本记录" : "NEXT / 手动续写";
  const description = target === "trends" ? "把公开平台观察放在创作页之外，作为独立研究工具使用。" : target === "versions" ? "每次大纲和正文生成都会留下可回看的版本记录。" : "自动续写已关闭；只有你在正文编辑中点击 AI 续写，系统才会生成内容。";
  const goWorkspace = () => {
    if (typeof window === "undefined") return;
    window.history.pushState(null, "", projectNavigationUrl(project.id, "workspace"));
    window.dispatchEvent(new Event("hashchange"));
  };
  return <div className="module-page motion-rise">
    <div className="module-page__head">
      <div><p className="module-page__eyebrow">{eyebrow}</p><h2 className="module-page__title">{title}</h2><p className="module-page__description">{description}</p></div>
      <Button variant="outline" className="rounded-none" onClick={goWorkspace}>返回创作工作台</Button>
    </div>
    {target === "trends" && <StandaloneTrendPanel trends={trends} />}
    {target === "versions" && <Card className="rounded-none"><CardHeader><CardTitle className="font-display text-2xl">{project.title} · 版本时间线</CardTitle></CardHeader><CardContent><div className="grid gap-5 lg:grid-cols-[280px_1fr]"> <div className="space-y-2">{versions.data?.map((version: any) => <button key={version.id} onClick={() => setSelectedVersion(version)} className={`w-full border p-3 text-left ${selectedVersion?.id === version.id ? "bg-foreground text-background" : "bg-card"}`}><p className="text-sm font-semibold">{version.label}</p><p className="mt-1 text-xs opacity-60">{new Date(version.createdAt).toLocaleString()}</p></button>)}{!versions.data?.length && <p className="text-sm leading-6 text-muted-foreground">暂时还没有版本记录。生成大纲或正文后，版本会自动出现在这里。</p>}</div><div className="min-h-[260px] border p-5"><p className="mb-4 text-xs uppercase tracking-[.2em] text-muted-foreground">{selectedVersion?.label ?? "选择一个版本"}</p><pre className="whitespace-pre-wrap font-sans text-sm leading-7">{selectedVersion?.content ?? ""}</pre></div></div></CardContent></Card>}
    {target === "schedule" && <Card className="max-w-3xl rounded-none"><CardHeader><CardTitle className="font-display text-2xl">手动续写工作流</CardTitle></CardHeader><CardContent><p className="mb-5 text-sm leading-7 text-muted-foreground">历史自动计划不会再调用 AI。请进入创作工作台的正文编辑，审核当前章节后点击“AI 续写下一章”。</p><div className="border-l-2 border-accent pl-4 text-xs leading-6 text-muted-foreground">生成仍受项目配额、并发锁和版本归档保护。</div><div className="mt-6 space-y-3">{schedules.data?.filter((schedule: any) => schedule.projectId === project.id).map((schedule: any) => <div key={schedule.id} className="border p-4"><p className="font-mono text-xs tracking-[.12em]">历史计划：{schedule.cronExpression}</p><p className="mt-2 text-xs text-muted-foreground">已停用；不会再自动生成章节。</p></div>)}{!schedules.data?.some((schedule: any) => schedule.projectId === project.id) && <p className="text-sm text-muted-foreground">当前项目没有后台续写计划。</p>}</div></CardContent></Card>}
  </div>;
}

function ProjectWorkspace({
  project,
  workspace,
  trends,
  wordCount,
  navigationTarget,
  onDelete,
}: {
  project: any;
  workspace: any;
  trends: any[];
  wordCount: number;
  navigationTarget: string;
  onDelete: () => void;
}) {
  const utils = trpc.useUtils();
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.workspace.get.invalidate({ projectId: project.id });
      toast.success("项目资料已更新");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const [editingProject, setEditingProject] = useState(false);
  const [projectDraft, setProjectDraft] = useState({
    title: project.title,
    genre: project.genre,
    synopsis: project.synopsis,
    targetWords: project.targetWords,
  });
  const [direction, setDirection] = useState("");
  const [outline, setOutline] = useState("");
  const [activeChapter, setActiveChapter] = useState<any>(null);
  const [style, setStyle] = useState(
    "克制、细腻、具有连续追读钩子的中文网文叙事。"
  );
  const [activeTab, setActiveTab] = useState("outline");
  useEffect(() => {
    setActiveTab(targetToWorkspaceTab(readNavTarget(`#${navigationTarget}`)));
  }, [navigationTarget]);
  const generateOutline = trpc.workspace.generateOutline.useMutation({
    onSuccess: value => {
      setOutline(value);
      saveVersion.mutate({
        projectId: project.id,
        entityType: "outline",
        entityId: 0,
        label: "AI 大纲生成",
        content: value,
      });
      toast.success("章节大纲已生成，可继续编辑");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const handleGenerateOutline = () => {
    const cleanedDirection = normalizeStoryDirection(direction);
    if (!canGenerateOutline(cleanedDirection)) {
      toast.error("请先填写故事方向，再生成章节大纲");
      return;
    }
    generateOutline.mutate({
      projectId: project.id,
      direction: cleanedDirection,
      chapterCount: 30,
    });
  };
  const saveVersion = trpc.workspace.saveVersion.useMutation({
    onSuccess: () => toast.success("版本已归档"),
  });
  const schedules = trpc.schedules.list.useQuery();
  const scheduleSetEnabled = trpc.schedules.setEnabled.useMutation({
    onSuccess: () => {
      schedules.refetch();
      toast.success("续写计划状态已更新");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const scheduleRemove = trpc.schedules.remove.useMutation({
    onSuccess: () => {
      schedules.refetch();
      toast.success("续写计划已删除");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const createTrend = trpc.trends.create.useMutation({
    onSuccess: () => {
      utils.trends.list.invalidate();
      toast.success("趋势标签已加入");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const removeTrend = trpc.trends.remove.useMutation({
    onSuccess: () => {
      utils.trends.list.invalidate();
      toast.success("趋势标签已删除");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const updateTrend = trpc.trends.update.useMutation({
    onSuccess: () => {
      utils.trends.list.invalidate();
      toast.success("趋势标签已更新");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const refreshTrends = trpc.trends.refresh.useMutation({
    onSuccess: () => {
      utils.trends.list.invalidate();
      toast.success("趋势研究已更新");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const [newTrend, setNewTrend] = useState({
    label: "",
    category: "",
    heat: 70,
    note: "",
  });
  const [assistantMode, setAssistantMode] = useState<"polish" | "names" | "ideas">("polish");
  const [assistantText, setAssistantText] = useState("");
  const [assistantResult, setAssistantResult] = useState("");
  const [polishOriginal, setPolishOriginal] = useState("");
  const [diffFilter, setDiffFilter] = useState<"all" | "added" | "removed">("all");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"saved" | "draft" | "restored" | "offline">("saved");
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine); 
  const restoredDraftKey = useRef("");
  const assistWriting = trpc.workspace.assistWriting.useMutation({
    onSuccess: value => {
      setAssistantResult(value);
      toast.success(assistantMode === "polish" ? "润色建议已生成，请审核后采用" : "AI 建议已生成");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const latestDraftBackup = (trpc.workspace as any).latestDraftBackup?.useQuery ? (trpc.workspace as any).latestDraftBackup.useQuery({ projectId: project.id, entityType: "chapter", entityId: activeChapter?.id ?? 0 }, { enabled: Boolean(activeChapter?.id) }) : { data: null };
  const saveDraftBackup = (trpc.workspace as any).saveDraftBackup?.useMutation ? (trpc.workspace as any).saveDraftBackup.useMutation({ onSuccess: () => toast.success("服务端草稿备份已保存"), onError: (error: any) => toast.error(getMutationErrorMessage(error)) }) : { mutate: () => undefined, isPending: false };
  const cleanupDraftBackups = trpc.workspace.cleanupDraftBackups.useMutation({ onSuccess: result => { latestDraftBackup.refetch?.(); toast.success(result.deleted ? `已清理 ${result.deleted} 个服务端草稿备份` : "草稿已是最新，无需清理"); }, onError: error => toast.error(getMutationErrorMessage(error)) });
  const saveChapter = trpc.workspace.saveChapter.useMutation({
    onSuccess: (_value, variables) => {
      utils.workspace.get.invalidate({ projectId: project.id });
      utils.workspace.versions.invalidate();
      try { window.localStorage.removeItem(getDraftKey(project.id, variables.id)); } catch {}
      setDraftStatus("saved");
      toast.success("章节已保存");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const generateChapter = trpc.workspace.generateChapter.useMutation({
    onSuccess: value => {
      const chapter = value.at(-1);
      setActiveChapter(chapter);
      if (chapter)
        saveVersion.mutate({
          projectId: project.id,
          entityType: "chapter",
          entityId: chapter.id,
          label: `第${chapter.chapterNumber}章生成`,
          content: chapter.body,
        });
      toast.success("章节正文已生成");
    },
  });
  const generateDocument = trpc.workspace.generateDocument.useMutation({
    onSuccess: (value, variables) => {
      setDocs((current: typeof emptyDocs) => ({ ...current, [variables.field]: value }));
      toast.success(`${variables.field === "worldSetting" ? "世界背景" : variables.field === "characters" ? "人物设定" : variables.field === "conflicts" ? "核心冲突" : "风格指令"}已生成，可继续编辑`);
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const continueChapter = trpc.workspace.continueChapter.useMutation({
    onSuccess: value => {
      const chapter = value.at(-1);
      setActiveChapter(chapter);
      if (chapter) saveVersion.mutate({ projectId: project.id, entityType: "chapter", entityId: chapter.id, label: `第${chapter.chapterNumber}章手动续写`, content: chapter.body });
      utils.workspace.get.invalidate({ projectId: project.id });
      toast.success("下一章已生成，请先审核再保存");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const saveDocs = trpc.workspace.saveDocs.useMutation({
    onSuccess: () => {
      utils.workspace.get.invalidate({ projectId: project.id });
      toast.success("策划文档已保存");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const [docs, setDocs] = useState({
    ...emptyDocs,
    ...(workspace?.docs ?? {}),
  });
  useEffect(() => {
    if (workspace?.docs) {
      setDocs({ ...emptyDocs, ...workspace.docs });
      setOutline(workspace.docs.outline ?? "");
    }
  }, [workspace?.docs]);
  const chapters = workspace?.chapters ?? [];
  const current = activeChapter ?? chapters[0];
  const polishDiff = useMemo(() => buildTextDiff(polishOriginal || current?.body || "", assistantResult), [assistantResult, current?.body, polishOriginal]);
  const visiblePolishDiff = useMemo(() => diffFilter === "all" ? polishDiff : polishDiff.filter(segment => segment.kind === "same" || segment.kind === diffFilter), [diffFilter, polishDiff]);
  const currentChapterWords = countWritingUnits(current?.body);
  useEffect(() => {
    const onOnline = () => { setIsOnline(true); setDraftStatus("saved"); };
    const onOffline = () => { setIsOnline(false); setDraftStatus("offline"); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);
  useEffect(() => {
    if (!current?.id) return;
    const key = getDraftKey(project.id, current.id);
    const draft = readChapterDraft(project.id, current.id);
    const serverUpdatedAt = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
    if (draft && draft.updatedAt > serverUpdatedAt && restoredDraftKey.current !== key) {
      restoredDraftKey.current = key;
      setActiveChapter({ ...current, title: draft.title, outline: draft.outline, body: draft.body, targetWords: draft.targetWords });
      setDraftStatus("restored");
      toast.success("已恢复本机未提交草稿");
    }
  }, [project.id, current?.id]);
  useEffect(() => {
    if (!current?.id) return;
    writeChapterDraft(project.id, current.id, { title: current.title ?? "", outline: current.outline ?? "", body: current.body ?? "", targetWords: current.targetWords ?? 3000 });
    setDraftStatus(isOnline ? "draft" : "offline");
  }, [project.id, current?.id, current?.title, current?.outline, current?.body, current?.targetWords, isOnline]);
  const [dailyGoal, setDailyGoal] = useState(() => readWritingPreference(`novel-forge:daily-goal:${project.id}`, 1000));
  const [dailyBaseline, setDailyBaseline] = useState(wordCount);
  useEffect(() => {
    setDailyGoal(readWritingPreference(`novel-forge:daily-goal:${project.id}`, 1000));
  }, [project.id]);
  useEffect(() => {
    if (!workspace?.data) return;
    const key = `novel-forge:daily-baseline:${project.id}:${writingDayKey()}`;
    const stored = readWritingPreference(key, -1);
    if (stored < 0) {
      writeWritingPreference(key, wordCount);
      setDailyBaseline(wordCount);
    } else {
      setDailyBaseline(stored);
    }
  }, [project.id, workspace?.data, wordCount]);
  const dailyWritten = Math.max(0, wordCount - dailyBaseline);
  const dailyProgress = writingGoalProgress(dailyWritten, dailyGoal);
  const versionEntityType = current
    ? ("chapter" as const)
    : ("outline" as const);
  const versions = trpc.workspace.versions.useQuery(
    {
      projectId: project.id,
      entityType: versionEntityType,
      entityId: current?.id ?? 0,
    },
    { enabled: Boolean(project.id) }
  );
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [compareVersion, setCompareVersion] = useState<any>(null);
  const rollbackVersion = trpc.workspace.rollbackVersion.useMutation({
    onSuccess: () => {
      utils.workspace.get.invalidate({ projectId: project.id });
      versions.refetch();
      toast.success("版本已持久化回滚");
    },
    onError: error => toast.error(getMutationErrorMessage(error)),
  });
  const safeFileName = project.title.trim().replace(/[\\/:*?"<>|]/g, "-") || "novel-forge-project";
  const chapterText = chapters
    .map((c: any) => `第${c.chapterNumber}章 ${c.title}\n\n${c.body}`)
    .join("\n\n");
  const plainText = `${project.title}\n\n${project.synopsis}\n\n【全书大纲】\n${outline}\n\n${chapterText}`;
  const markdownText = `# ${project.title}\n\n${project.synopsis}\n\n## 全书大纲\n\n${outline}\n\n${chapters
    .map((c: any) => `## 第${c.chapterNumber}章 ${c.title}\n\n${c.body}`)
    .join("\n\n")}`;
  const backupPayload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      project: { title: project.title, genre: project.genre, synopsis: project.synopsis, targetWords: project.targetWords },
      documents: { ...docs, outline },
      chapters,
    },
    null,
    2
  );
  const downloadFile = (content: string, fileName: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const exportText = () => {
    downloadFile(plainText, `${safeFileName}.txt`, "text/plain;charset=utf-8");
    toast.success("TXT 已下载，可作为本地备份");
  };
  const exportMarkdown = () => {
    downloadFile(markdownText, `${safeFileName}.md`, "text/markdown;charset=utf-8");
    toast.success("Markdown 已下载，可继续编辑或归档");
  };
  const exportBackup = () => {
    downloadFile(backupPayload, `${safeFileName}-backup.json`, "application/json;charset=utf-8");
    toast.success("项目备份已下载");
  };
  return (
    <div className="space-y-6 motion-rise">
      {editingProject && (
        <Card className="rounded-none border-foreground/20">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              编辑项目资料
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input
              value={projectDraft.title}
              onChange={e =>
                setProjectDraft({ ...projectDraft, title: e.target.value })
              }
              placeholder="书名"
            />
            <GenrePicker
              value={projectDraft.genre}
              onChange={genre => setProjectDraft({ ...projectDraft, genre })}
            />
            <Input
              type="number"
              value={projectDraft.targetWords}
              onChange={e =>
                setProjectDraft({
                  ...projectDraft,
                  targetWords: Number(e.target.value),
                })
              }
              placeholder="目标字数"
            />
            <Textarea
              className="md:col-span-2"
              value={projectDraft.synopsis}
              onChange={e =>
                setProjectDraft({ ...projectDraft, synopsis: e.target.value })
              }
              placeholder="简介"
            />
            <div className="flex gap-3 md:col-span-2">
              <Button
                className="rounded-none"
                onClick={() => {
                  updateProject.mutate({ id: project.id, ...projectDraft });
                  setEditingProject(false);
                }}
              >
                保存项目
              </Button>
              <Button
                variant="ghost"
                className="rounded-none"
                onClick={() => setEditingProject(false)}
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-foreground/20 pb-6">
        <div>
          <div className="flex gap-2 mb-4">
            <Badge
              variant="outline"
              className="rounded-none uppercase tracking-[.15em] text-[10px]"
            >
              {project.genre}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-none uppercase tracking-[.15em] text-[10px]"
            >
              {project.status}
            </Badge>
          </div>
          <h2 className="font-display text-5xl md:text-6xl leading-none">
            {project.title}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
            {project.synopsis || "尚未填写作品简介。"}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
          <Button
            variant="outline"
            className="min-h-11 flex-1 rounded-none sm:flex-none"
            onClick={exportText}
          >
            <FileDown className="mr-2 h-4 w-4" />
            下载 TXT
          </Button>
          <Button
            variant="outline"
            className="min-h-11 flex-1 rounded-none sm:flex-none"
            onClick={exportMarkdown}
          >
            <Download className="mr-2 h-4 w-4" />
            Markdown
          </Button>
          <Button
            variant="outline"
            className="min-h-11 flex-1 rounded-none sm:flex-none"
            onClick={exportBackup}
          >
            <Save className="mr-2 h-4 w-4" />
            备份项目
          </Button>
          <Button
            variant="outline"
            className="min-h-11 flex-1 rounded-none sm:flex-none"
            onClick={() => setEditingProject(true)}
          >
            编辑项目
          </Button>
          <Button
            variant="ghost"
            className="rounded-none text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-foreground/15 border border-foreground/15">
        <Metric
          label="目标字数"
          value={`${Math.round(project.targetWords / 10000)} 万`}
        />
        <Metric label="当前正文" value={`${wordCount.toLocaleString()} 字`} />
        <Metric label="章节数" value={`${chapters.length} 章`} />
        <Metric label="续写方式" value="手动触发" />
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-6 overflow-x-auto rounded-none border-b bg-transparent h-12">
          <TabsTrigger
            value="outline"
            className="rounded-none px-0 data-[state=active]:border-b-2 data-[state=active]:border-foreground"
          >
            章节大纲
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-none px-0 data-[state=active]:border-b-2 data-[state=active]:border-foreground"
          >
            世界与人物
          </TabsTrigger>
          <TabsTrigger
            value="chapters"
            className="rounded-none px-0 data-[state=active]:border-b-2 data-[state=active]:border-foreground"
          >
            正文编辑
          </TabsTrigger>
        </TabsList>
        <TabsContent value="outline" className="pt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
            <Card className="rounded-none">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="font-display text-2xl">
                  全书结构提案
                </CardTitle>
                <Badge className="rounded-none bg-accent text-accent-foreground">
                  AI 生成
                </Badge>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[360px] leading-7"
                  placeholder="输入故事方向，例如：女主在现代都市中发现……"
                  value={outline}
                  onChange={e => {
                    setOutline(e.target.value);
                    setDocs({ ...docs, outline: e.target.value });
                  }}
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    className="rounded-none"
                    disabled={generateOutline.isPending}
                    onClick={handleGenerateOutline}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    生成 30 章提案
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-none"
                    disabled={!outline}
                    onClick={() =>
                      saveVersion.mutate({
                        projectId: project.id,
                        entityType: "outline",
                        entityId: 0,
                        label: "大纲快照",
                        content: outline,
                      })
                    }
                  >
                    归档版本
                  </Button>
                  <Input
                    className="max-w-sm rounded-none"
                    placeholder="补充故事方向"
                    value={direction}
                    onChange={e => setDirection(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-none bg-[#171613] text-[#f5f1e9] border-[#171613]">
              <CardHeader>
                <CardTitle className="font-display text-2xl">
                  编辑提示
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-[#f5f1e9]/70">
                先让 AI
                生成结构，再由你调整冲突密度、人物动机和每章结尾。满意后可将大纲复制进版本档案。
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="settings" className="pt-6">
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="font-display text-2xl">策划文档</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <DocumentField
                label="世界背景"
                field="worldSetting"
                value={docs.worldSetting}
                onChange={value => setDocs({ ...docs, worldSetting: value })}
                onGenerate={() => generateDocument.mutate({ projectId: project.id, field: "worldSetting", currentValue: docs.worldSetting, outline })}
                pending={generateDocument.isPending}
              />
              <DocumentField
                label="人物设定"
                field="characters"
                value={docs.characters}
                onChange={value => setDocs({ ...docs, characters: value })}
                onGenerate={() => generateDocument.mutate({ projectId: project.id, field: "characters", currentValue: docs.characters, outline })}
                pending={generateDocument.isPending}
              />
              <DocumentField
                label="核心冲突"
                field="conflicts"
                value={docs.conflicts}
                onChange={value => setDocs({ ...docs, conflicts: value })}
                onGenerate={() => generateDocument.mutate({ projectId: project.id, field: "conflicts", currentValue: docs.conflicts, outline })}
                pending={generateDocument.isPending}
              />
              <DocumentField
                label="风格指令"
                field="styleGuide"
                value={docs.styleGuide}
                onChange={value => setDocs({ ...docs, styleGuide: value })}
                onGenerate={() => generateDocument.mutate({ projectId: project.id, field: "styleGuide", currentValue: docs.styleGuide, outline })}
                pending={generateDocument.isPending}
              />
              <Button
                className="rounded-none md:col-span-2 w-fit"
                disabled={saveDocs.isPending || generateDocument.isPending}
                onClick={() =>
                  saveDocs.mutate({ projectId: project.id, ...docs, outline })
                }
              >
                保存策划文档
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="chapters" className="pt-6">
          <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible">
              {chapters.map((chapter: any) => (
                <button
                  key={chapter.id}
                  onClick={() => {
                    setActiveChapter(chapter);
                    window.setTimeout(() => document.getElementById("novel-forge-chapter-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
                  }}
                  aria-label={`打开第${chapter.chapterNumber}章`}
                  className={`min-w-[150px] shrink-0 border p-3 text-left transition-colors lg:w-full ${current?.id === chapter.id ? "bg-foreground text-background" : "bg-card hover:bg-accent/10"}`}
                >
                  <p className="text-[10px] uppercase tracking-[.2em] opacity-60">
                    Chapter {String(chapter.chapterNumber).padStart(2, "0")}
                  </p>
                  <p className="font-display mt-2">{chapter.title}</p>
                </button>
              ))}
              {!chapters.length && (
                <p className="text-sm text-muted-foreground leading-6">
                  生成大纲后，在这里逐章建立正文。
                </p>
              )}
            </div>
            <Card id="novel-forge-chapter-editor" className="scroll-mt-20 rounded-none">
              <CardHeader>
                <CardTitle className="font-display text-2xl">
                  正文生成器
                </CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">手机端可横向切换章节；正文区域使用较大字号，适合连续阅读和修改。</p>
              </CardHeader>
              <CardContent>
                <div className="mb-5 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
                  <div className="bg-card p-3"><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">当前章节</p><p className="mt-2 font-display text-2xl">{currentChapterWords.toLocaleString()} <span className="font-sans text-xs text-muted-foreground">字</span></p></div>
                  <div className="bg-card p-3"><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">全书总字数</p><p className="mt-2 font-display text-2xl">{wordCount.toLocaleString()} <span className="font-sans text-xs text-muted-foreground">字</span></p></div>
                  <label className="col-span-2 bg-card p-3 sm:col-span-1"><span className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">每日目标</span><Input aria-label="每日写作目标" type="number" min={1} step={100} className="mt-2 h-9 rounded-none" value={dailyGoal} onChange={event => { const value = Math.max(1, Number(event.target.value) || 1); setDailyGoal(value); writeWritingPreference(`novel-forge:daily-goal:${project.id}`, value); }} /></label>
                </div>
                <div className="mb-5 rounded-none border border-border bg-card p-3"><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">今日写作目标（按今日新增字数）</span><strong>{dailyWritten.toLocaleString()} / {dailyGoal.toLocaleString()} 字</strong></div><Progress value={dailyProgress} aria-label={`每日写作目标完成 ${dailyProgress}%`} /><p className="mt-2 text-[11px] text-muted-foreground">完成度 {dailyProgress}% · 保存正文后会更新今日新增字数；首次打开项目时会建立当天基线。</p></div>
                <Card className="mb-5 hidden rounded-none border-accent/40 bg-accent/5 md:block">
                  <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="font-display text-xl">AI 写作助手</CardTitle><p className="mt-1 text-xs leading-5 text-muted-foreground">AI 只提供建议；润色结果不会自动覆盖正文。</p></div><Sparkles className="h-5 w-5 text-accent" /></div></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">{([['polish', '一键润色'], ['names', '角色名字'], ['ideas', '剧情灵感']] as const).map(([mode, label]) => <Button key={mode} type="button" variant={assistantMode === mode ? "default" : "outline"} className="min-h-10 rounded-none px-2 text-xs" onClick={() => { setAssistantMode(mode); setAssistantResult(""); }}>{label}</Button>)}</div>
                    <Textarea className="min-h-28 text-[16px] leading-7" value={assistantText} onChange={event => setAssistantText(event.target.value)} placeholder={assistantMode === "polish" ? "粘贴或输入想要润色的正文；留空则使用当前章节正文。" : assistantMode === "names" ? "输入角色设定，例如：冷静、擅长机关术的女主。" : "输入剧情方向或冲突；留空则参考当前章节和大纲。"} />
                    <Button type="button" className="min-h-11 rounded-none" disabled={assistWriting.isPending} onClick={() => { const source = assistantText.trim() || current?.body || docs.characters || outline || "请基于当前项目提供建议"; if (assistantMode === "polish") setPolishOriginal(source); assistWriting.mutate({ projectId: project.id, chapterId: current?.id, mode: assistantMode, text: source, context: `${current?.outline ?? ""}\n${outline}\n${docs.characters}\n${docs.conflicts}` }); }}>{assistWriting.isPending ? "生成中…" : assistantMode === "polish" ? "生成润色建议" : assistantMode === "names" ? "生成角色名字" : "生成剧情灵感"}</Button>
                    {assistantResult && <div className="space-y-3 rounded-none border border-border bg-background/60 p-3"><div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">AI 建议 / 待审核</span><Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="丢弃 AI 建议" onClick={() => setAssistantResult("")}><X className="h-4 w-4" /></Button></div>{assistantMode === "polish" ? <div className="grid gap-3 md:grid-cols-2"><div className="min-w-0"><p className="mb-2 text-[10px] uppercase tracking-[.16em] text-muted-foreground">差异高亮 <span className="normal-case tracking-normal text-rose-700">删除</span> / <span className="normal-case tracking-normal text-emerald-700">新增</span></p><DiffHighlightedText ariaLabel="原文与 AI 润色结果差异" original={polishOriginal || current?.body || ""} revised={assistantResult} /></div><div className="min-w-0"><p className="mb-2 text-[10px] uppercase tracking-[.16em] text-accent">AI 润色结果</p><Textarea aria-label="AI 润色结果" className="min-h-36 resize-y text-[16px] leading-7" value={assistantResult} onChange={event => setAssistantResult(event.target.value)} /></div></div> : <Textarea aria-label="AI 建议结果" className="min-h-36 text-[16px] leading-7" value={assistantResult} onChange={event => setAssistantResult(event.target.value)} />}<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-10 rounded-none text-xs" onClick={() => { void navigator.clipboard?.writeText(assistantResult); toast.success("建议已复制"); }}><Copy className="mr-2 h-3.5 w-3.5" />复制建议</Button>{assistantMode === "polish" && <Button type="button" variant="outline" className="min-h-10 rounded-none text-xs" onClick={() => { setActiveChapter({ ...(current ?? {}), body: assistantResult }); toast.success("润色结果已回填，请保存正文"); }}><Check className="mr-2 h-3.5 w-3.5" />采用润色结果</Button>}</div></div>}
                  </CardContent>
                </Card>
                <div className="mb-5 md:hidden"><Button type="button" variant="outline" className="min-h-11 w-full rounded-none border-accent/50" onClick={() => setAssistantOpen(true)}><Sparkles className="mr-2 h-4 w-4 text-accent" />打开 AI 写作助手{assistantResult ? " · 有待审核建议" : ""}</Button><Drawer open={assistantOpen} onOpenChange={setAssistantOpen}><DrawerContent className="max-h-[88vh]"><DrawerHeader><DrawerTitle className="font-display text-xl">AI 写作助手</DrawerTitle><DrawerDescription>在底部抽屉中生成建议，审核后再回填正文。</DrawerDescription></DrawerHeader><div className="overflow-y-auto px-4 pb-4"><div className="grid grid-cols-3 gap-2">{([['polish', '一键润色'], ['names', '角色名字'], ['ideas', '剧情灵感']] as const).map(([mode, label]) => <Button key={mode} type="button" variant={assistantMode === mode ? "default" : "outline"} className="min-h-10 rounded-none px-2 text-xs" onClick={() => { setAssistantMode(mode); setAssistantResult(""); }}>{label}</Button>)}</div><Textarea className="mt-3 min-h-28 text-[16px] leading-7" value={assistantText} onChange={event => setAssistantText(event.target.value)} placeholder={assistantMode === "polish" ? "粘贴或输入想要润色的正文；留空则使用当前章节正文。" : assistantMode === "names" ? "输入角色设定，例如：冷静、擅长机关术的女主。" : "输入剧情方向或冲突；留空则参考当前章节和大纲。"} /><Button type="button" className="mt-3 min-h-11 w-full rounded-none" disabled={assistWriting.isPending} onClick={() => { const source = assistantText.trim() || current?.body || docs.characters || outline || "请基于当前项目提供建议"; if (assistantMode === "polish") setPolishOriginal(source); assistWriting.mutate({ projectId: project.id, chapterId: current?.id, mode: assistantMode, text: source, context: `${current?.outline ?? ""}\n${outline}\n${docs.characters}\n${docs.conflicts}` }); }}>{assistWriting.isPending ? "生成中…" : assistantMode === "polish" ? "生成润色建议" : assistantMode === "names" ? "生成角色名字" : "生成剧情灵感"}</Button>{assistantResult && <div className="mt-4 space-y-3 border border-border bg-background/60 p-3"><div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">AI 建议 / 待审核</span><Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="丢弃 AI 建议" onClick={() => setAssistantResult("")}><X className="h-4 w-4" /></Button></div>{assistantMode === "polish" ? <div className="space-y-3"><div><p className="mb-1 text-[10px] uppercase tracking-[.16em] text-muted-foreground">差异高亮 <span className="normal-case tracking-normal text-rose-700">删除</span> / <span className="normal-case tracking-normal text-emerald-700">新增</span></p><div className="mb-2 flex flex-wrap gap-2"><Button type="button" variant={diffFilter === "all" ? "default" : "outline"} className="h-8 rounded-none text-xs" onClick={() => setDiffFilter("all")}>全部</Button><Button type="button" variant={diffFilter === "added" ? "default" : "outline"} className="h-8 rounded-none text-xs" onClick={() => setDiffFilter("added")}>仅新增</Button><Button type="button" variant={diffFilter === "removed" ? "default" : "outline"} className="h-8 rounded-none text-xs" onClick={() => setDiffFilter("removed")}>仅删除</Button></div><DiffHighlightedText ariaLabel="移动端原文与 AI 润色结果差异" original={polishOriginal || current?.body || ""} revised={assistantResult} filter={diffFilter} /></div><div><p className="mb-1 text-[10px] uppercase tracking-[.16em] text-accent">AI 润色结果</p><Textarea aria-label="移动端 AI 润色结果" className="min-h-28 text-[16px] leading-7" value={assistantResult} onChange={event => setAssistantResult(event.target.value)} /></div></div> : <Textarea aria-label="移动端 AI 建议结果" className="min-h-32 text-[16px] leading-7" value={assistantResult} onChange={event => setAssistantResult(event.target.value)} />}<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-10 rounded-none text-xs" onClick={() => { void navigator.clipboard?.writeText(assistantResult); toast.success("建议已复制"); }}><Copy className="mr-2 h-3.5 w-3.5" />复制建议</Button>{assistantMode === "polish" && <DrawerClose asChild><Button type="button" variant="outline" className="min-h-10 rounded-none text-xs" onClick={() => { setActiveChapter({ ...(current ?? {}), body: assistantResult }); toast.success("润色结果已回填，请保存正文"); }}><Check className="mr-2 h-3.5 w-3.5" />采用并返回正文</Button></DrawerClose>}</div></div>}</div><DrawerFooter><DrawerClose asChild><Button variant="outline" className="min-h-11 rounded-none">暂时关闭</Button></DrawerClose></DrawerFooter></DrawerContent></Drawer></div>
                <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 border px-3 py-3 text-sm ${draftStatus === "offline" || draftStatus === "draft" ? "border-amber-500/50 bg-amber-500/10" : draftStatus === "restored" ? "border-accent/50 bg-accent/10" : "border-emerald-600/30 bg-emerald-500/5"}`}><span className="font-medium">{draftStatus === "restored" ? "已恢复草稿" : draftStatus === "offline" ? "离线草稿已保存" : saveChapter.isPending ? "保存中…" : draftStatus === "draft" ? "本机草稿已保存" : "已保存"}</span><span className="text-xs text-muted-foreground">{isOnline ? "在线同步可用" : "网络暂时不可用，内容已保存在本机"}</span><span className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="h-8 rounded-none text-xs" disabled={saveDraftBackup.isPending || !current?.id} onClick={() => saveDraftBackup.mutate({ projectId: project.id, entityType: "chapter", entityId: current?.id ?? 0, content: JSON.stringify({ title: activeChapter?.title ?? "", outline: activeChapter?.outline ?? "", body: activeChapter?.body ?? "", targetWords: activeChapter?.targetWords ?? 3000 }) })}>{saveDraftBackup.isPending ? "备份中…" : "备份到服务器"}</Button><Button type="button" variant="ghost" className="h-8 rounded-none text-xs" disabled={cleanupDraftBackups.isPending} onClick={() => cleanupDraftBackups.mutate({ projectId: project.id })}>{cleanupDraftBackups.isPending ? "清理中…" : "清理旧草稿"}</Button>{latestDraftBackup.data && <Button type="button" variant="ghost" className="h-8 rounded-none text-xs" onClick={() => { try { const draft = JSON.parse(latestDraftBackup.data.content); setActiveChapter({ ...(current ?? {}), ...draft }); setDraftStatus("restored"); toast.success("已恢复服务端草稿"); } catch { toast.error("服务端草稿格式无效"); } }}>恢复服务端草稿</Button>}</span></div>
                <div className="grid gap-3 md:grid-cols-2 mb-4">
                  <Input
                    placeholder="章节标题"
                    value={current?.title ?? ""}
                    onChange={e =>
                      setActiveChapter({
                        ...(current ?? {}),
                        title: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="目标字数"
                    type="number"
                    value={current?.targetWords ?? 3000}
                    onChange={e =>
                      setActiveChapter({
                        ...(current ?? {}),
                        targetWords: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <Textarea
                  className="min-h-[130px] mb-4"
                  placeholder="本章大纲与场景目标"
                  value={current?.outline ?? ""}
                  onChange={e =>
                    setActiveChapter({
                      ...(current ?? {}),
                      outline: e.target.value,
                    })
                  }
                />
                <Textarea
                  className="min-h-[55vh] resize-y px-4 py-4 text-[16px] leading-8 font-serif md:min-h-[330px]"
                  placeholder="生成后的正文将在这里呈现，也可以直接手动修改。"
                  value={current?.body ?? ""}
                  onChange={e =>
                    setActiveChapter({
                      ...(current ?? {}),
                      body: e.target.value,
                    })
                  }
                />
                <div className="sticky bottom-3 z-10 mt-4 grid grid-cols-2 gap-2 bg-background/95 p-2 shadow-sm backdrop-blur sm:static sm:flex sm:flex-wrap sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
                  <Button
                    className="min-h-11 rounded-none"
                    disabled={generateChapter.isPending}
                    onClick={() =>
                      generateChapter.mutate({
                        projectId: project.id,
                        chapterId: current?.id,
                        chapterNumber:
                          current?.chapterNumber ?? chapters.length + 1,
                        title: current?.title || `第${chapters.length + 1}章`,
                        outline: current?.outline || "推进主线冲突",
                        targetWords: current?.targetWords ?? 3000,
                        style,
                      })
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI 生成本章正文
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-11 rounded-none"
                    disabled={continueChapter.isPending}
                    onClick={() =>
                      continueChapter.mutate({
                        projectId: project.id,
                        previousChapterId: current?.id,
                        targetWords: current?.targetWords ?? 3000,
                        style,
                      })
                    }
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    AI 续写下一章
                  </Button>
                  <Input
                    className="col-span-2 min-h-11 rounded-none sm:min-w-[280px] sm:flex-1"
                    value={style}
                    onChange={e => setStyle(e.target.value)}
                    placeholder="风格指令"
                  />
                  <Button
                    variant="outline"
                    className="min-h-11 rounded-none"
                    disabled={!current?.id || saveChapter.isPending}
                    onClick={() =>
                      current &&
                      saveChapter.mutate({
                        id: current.id,
                        title: current.title,
                        outline: current.outline,
                        body: current.body,
                        targetWords: current.targetWords,
                      })
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saveChapter.isPending ? "保存中…" : "保存正文"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="trends" className="pt-6">
          <Card className="rounded-none">
            <CardHeader className="flex-row justify-between">
              <div>
                <CardTitle className="font-display text-2xl">
                  题材趋势库
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  手动标签、公开观察和 AI 研究建议统一进入表格，可按平台、小说分类和可信度筛选。
                </p>
              </div>
              <Button type="button" variant="outline" className="rounded-none" disabled={refreshTrends.isPending} onClick={() => refreshTrends.mutate()}><Sparkles className="mr-2 h-4 w-4" />{refreshTrends.isPending ? "研究建议生成中…" : "手动生成趋势建议"}</Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-6">
                <Input
                  className="rounded-none max-w-[180px]"
                  placeholder="标签，例如：都市"
                  value={newTrend.label}
                  onChange={e =>
                    setNewTrend({ ...newTrend, label: e.target.value })
                  }
                />
                <Input
                  className="rounded-none max-w-[180px]"
                  placeholder="分类"
                  value={newTrend.category}
                  onChange={e =>
                    setNewTrend({ ...newTrend, category: e.target.value })
                  }
                />
                <Input
                  className="rounded-none max-w-[220px]"
                  placeholder="趋势备注"
                  value={newTrend.note}
                  onChange={e =>
                    setNewTrend({ ...newTrend, note: e.target.value })
                  }
                />
                <Button
                  className="rounded-none"
                  disabled={!newTrend.label || !newTrend.category}
                  onClick={() => createTrend.mutate(newTrend)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  加入标签
                </Button>
              </div>
              <div className="mb-6 border-l-2 border-accent pl-4 text-xs leading-6 text-muted-foreground">
                公开来源包括番茄分类/首页观察、抖音公开搜索和 B
                站公开视频搜索；来源与局限已在表格中标注。
              </div>
              <TrendTable
                trends={trends}
                onEdit={trend => {
                  const label =
                    window.prompt("标签名称", trend.label) ?? trend.label;
                  const category =
                    window.prompt("标签分类", trend.category) ?? trend.category;
                  updateTrend.mutate({
                    id: trend.id,
                    label,
                    category,
                    heat: trend.heat,
                    note: trend.note,
                  });
                }}
                onDelete={trend => removeTrend.mutate({ id: trend.id })}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="versions" className="pt-6">
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="font-display text-2xl">版本档案</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                {" "}
                <div className="space-y-2">
                  {versions.data?.map(version => (
                    <button
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      className={`w-full text-left border p-3 ${selectedVersion?.id === version.id ? "bg-foreground text-background" : "bg-card"}`}
                    >
                      <p className="text-sm font-semibold">{version.label}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </button>
                  ))}
                  {!versions.data?.length && (
                    <p className="text-sm text-muted-foreground">
                      生成或归档内容后，这里会形成可回看的版本时间线。
                    </p>
                  )}
                </div>
                <div className="border p-5 min-h-[220px]">
                  <p className="text-xs uppercase tracking-[.2em] text-muted-foreground mb-4">
                    {selectedVersion?.label ?? "选择一个版本"}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-7">
                    {selectedVersion?.content ?? ""}
                  </pre>
                  {selectedVersion && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button
                        className="rounded-none"
                        onClick={() =>
                          rollbackVersion.mutate({
                            versionId: selectedVersion.id,
                          })
                        }
                      >
                        持久化回滚
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-none"
                        onClick={() => {
                          if (versionEntityType === "outline")
                            setOutline(selectedVersion.content);
                          else if (current)
                            setActiveChapter({
                              ...current,
                              body: selectedVersion.content,
                            });
                          toast.success("版本已恢复到编辑器");
                        }}
                      >
                        恢复到编辑器
                      </Button>
                      <Button
                        variant="ghost"
                        className="rounded-none"
                        onClick={() => setCompareVersion(selectedVersion)}
                      >
                        设为对比版本
                      </Button>
                    </div>
                  )}
                  {compareVersion &&
                    selectedVersion &&
                    compareVersion.id !== selectedVersion.id && (
                      <div className="mt-6 grid gap-4 md:grid-cols-2 border-t pt-5">
                        <div>
                          <p className="text-xs uppercase tracking-[.2em] text-muted-foreground mb-2">
                            当前选择
                          </p>
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-7">
                            {selectedVersion.content}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[.2em] text-muted-foreground mb-2">
                            对比版本
                          </p>
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-7">
                            {compareVersion.content}
                          </pre>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="schedule" className="pt-6">
          <Card className="rounded-none max-w-2xl">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                手动续写
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-7 mb-5">
                自动续写已关闭。只有你在“正文编辑”中点击“AI 续写下一章”后，系统才会生成内容；生成后请先审核，再保存到项目。
              </p>
              <div className="border-l-2 border-accent pl-4 text-xs leading-6 text-muted-foreground">
                手动触发会继续沿用项目配额、并发锁和版本归档保护，不会在后台静默创建章节。
              </div>
              <div className="mt-6 space-y-3">
                {schedules.data
                  ?.filter((schedule: any) => schedule.projectId === project.id)
                  .map((schedule: any) => (
                    <div
                      key={schedule.id}
                      className="flex flex-col gap-3 border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-mono text-xs tracking-[.12em]">
                          历史计划：{schedule.cronExpression}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          已停用；不会再自动生成章节。
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        className="rounded-none text-destructive"
                        onClick={() => scheduleRemove.mutate({ id: schedule.id })}
                      >
                        删除历史计划
                      </Button>
                    </div>
                  ))}
                {!schedules.data?.some(
                  (schedule: any) => schedule.projectId === project.id
                ) && (
                  <p className="text-sm text-muted-foreground">
                    当前项目没有后台续写计划。请到“正文编辑”手动开始 AI 续写。
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[10px] uppercase tracking-[.22em] text-muted-foreground">
        {label}
      </span>
      <Textarea
        className="min-h-[150px] rounded-none"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
}

function DocumentField({
  label,
  field,
  value,
  onChange,
  onGenerate,
  pending,
}: {
  label: string;
  field: "worldSetting" | "characters" | "conflicts" | "styleGuide";
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-2">
      <Field label={label} value={value} onChange={onChange} />
      <Button
        type="button"
        variant="outline"
        className="rounded-none"
        disabled={pending}
        onClick={onGenerate}
        aria-label={`AI 生成${label}`}
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        AI 生成{label}
      </Button>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-5">
      <p className="text-[10px] uppercase tracking-[.2em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-2xl mt-3">{value}</p>
    </div>
  );
}
