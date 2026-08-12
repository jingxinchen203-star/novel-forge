import { Toaster } from "@/components/ui/sonner";
import { Suspense, lazy } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
const Home = lazy(() => import("./pages/Home"));

function Router() {
  return <Suspense fallback={<div className="min-h-[calc(100vh-4rem)] editorial-grid grid place-items-center text-xs uppercase tracking-[.2em] text-muted-foreground">Loading desk…</div>}><Switch><Route path="/" component={Home} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><DashboardLayout><Router /></DashboardLayout></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
