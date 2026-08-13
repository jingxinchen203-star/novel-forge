import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { BookOpen, Bell, CalendarClock, FileText, LayoutDashboard, LogOut, PanelLeft, Tags } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { currentHash, readNavTarget } from "@/lib/navigation";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

const menuItems = [
  { icon: LayoutDashboard, label: "项目总览", path: "/", target: "overview" },
  { icon: BookOpen, label: "创作工作台", path: "/", target: "workspace" },
  { icon: Tags, label: "题材趋势库", path: "/", target: "trends" },
  { icon: FileText, label: "版本档案", path: "/", target: "versions" },
  { icon: CalendarClock, label: "续写计划", path: "/", target: "schedule" },
] as const;
const SIDEBAR_WIDTH_KEY = "sidebar-width";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, error } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return 280;
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? Math.max(220, Math.min(420, parsed)) : 280;
  });
  useEffect(() => { try { window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); } catch { /* private mode or blocked storage */ } }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="min-h-screen editorial-grid flex items-center justify-center px-6"><div className="max-w-md text-center"><p className="text-xs uppercase tracking-[.3em] text-muted-foreground mb-5">Novel Forge / Private Studio</p><h1 className="font-display text-5xl mb-4">你的下一本书，值得更好的编辑室。</h1><p className="text-muted-foreground leading-7 mb-8">登录后管理项目设定、章节生成和版本档案。</p>{error && <p role="status" className="mb-5 text-sm leading-6 text-amber-700">登录验证未完成或会话已失效，请检查浏览器 Cookie 与人机验证后重试。</p>}<Button onClick={() => startLogin()} className="rounded-none px-8">{error ? "重新登录" : "进入编辑室"}</Button></div></div>;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth(); const { state, toggleSidebar } = useSidebar(); const isCollapsed = state === "collapsed"; const [resizing, setResizing] = useState(false); const [activeTarget, setActiveTarget] = useState(() => readNavTarget(currentHash())); const ref = useRef<HTMLDivElement>(null);
  const navigateToTarget = (target: (typeof menuItems)[number]["target"]) => { if (typeof window === "undefined") return; const url = new URL(window.location.href); url.hash = target; window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`); setActiveTarget(target); window.dispatchEvent(new Event("hashchange")); };
  useEffect(() => { const move = (e: MouseEvent) => { if (!resizing) return; const left = ref.current?.getBoundingClientRect().left ?? 0; setSidebarWidth(Math.max(220, Math.min(420, e.clientX - left))); }; const up = () => setResizing(false); if (resizing) { addEventListener("mousemove", move); addEventListener("mouseup", up); } return () => { removeEventListener("mousemove", move); removeEventListener("mouseup", up); }; }, [resizing, setSidebarWidth]); useEffect(() => { const onHashChange = () => setActiveTarget(readNavTarget(currentHash())); window.addEventListener("hashchange", onHashChange); return () => window.removeEventListener("hashchange", onHashChange); }, [setSidebarWidth]);
  return <><div ref={ref} className="relative"><Sidebar collapsible="icon" className="border-r bg-[#eee8de]"><SidebarHeader className="h-24 justify-center px-5"><div className="flex items-center gap-3"><button onClick={toggleSidebar} aria-label="切换导航" className="h-9 w-9 grid place-items-center rounded-full border bg-background"><PanelLeft className="h-4 w-4" /></button>{!isCollapsed && <div><p className="font-display text-xl leading-none">Novel Forge</p><p className="text-[10px] uppercase tracking-[.25em] text-muted-foreground mt-2">Editorial Studio</p></div>}</div></SidebarHeader><SidebarContent className="px-3 pt-5"><p className="px-3 mb-3 text-[10px] uppercase tracking-[.25em] text-muted-foreground group-data-[collapsible=icon]:hidden">Workspace</p><SidebarMenu>{menuItems.map(item => <SidebarMenuItem key={item.label}><SidebarMenuButton asChild isActive={activeTarget === item.target} tooltip={item.label} className="h-11 rounded-none font-medium"><a href={`#${item.target}`} onClick={event => { event.preventDefault(); navigateToTarget(item.target); }}><item.icon className="h-4 w-4" /><span>{item.label}</span></a></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="p-4"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-3 w-full text-left"><Avatar className="h-9 w-9 rounded-none"><AvatarFallback className="rounded-none bg-[#171613] text-[#f5f1e9]">{user?.name?.charAt(0).toUpperCase() ?? "N"}</AvatarFallback></Avatar><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="text-sm font-semibold truncate">{user?.name ?? "创作者"}</p><p className="text-xs text-muted-foreground truncate">Private workspace</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={logout}><LogOut className="mr-2 h-4 w-4" />退出登录</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div onMouseDown={() => !isCollapsed && setResizing(true)} className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent ${isCollapsed ? "hidden" : ""}`} /></div><SidebarInset><div className="sticky top-0 z-20 h-16 border-b bg-[#f5f1e9]/90 backdrop-blur flex items-center justify-between px-5 md:px-10"><div className="flex items-center gap-3"><SidebarTrigger className="md:hidden" /><span className="text-xs uppercase tracking-[.25em] text-muted-foreground">Writing desk / 01</span></div><div className="flex items-center gap-5 text-xs text-muted-foreground"><span className="hidden sm:inline-flex items-center gap-2"><Bell className="h-4 w-4" />通知中心</span><span className="hidden sm:inline">Saved locally · UTC+8</span></div></div><main className="flex-1">{children}</main></SidebarInset></>;
}
