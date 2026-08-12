import fs from "node:fs";

const path = "client/src/pages/Home.tsx";
const source = fs.readFileSync(path, "utf8");
const start = source.indexOf('<TabsContent value="trends" className="pt-6">');
const end = source.indexOf('<TabsContent value="versions" className="pt-6">', start);
if (start < 0 || end < 0) throw new Error("trend tab boundaries not found");
const replacement = `<TabsContent value="trends" className="pt-6"><Card className="rounded-none"><CardHeader className="flex-row justify-between"><div><CardTitle className="font-display text-2xl">题材趋势库</CardTitle><p className="text-sm text-muted-foreground mt-2">手动标签与多平台公开观察统一进入表格，可按平台、题材和可信度筛选。</p></div><Clock3 className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="flex flex-wrap gap-3 mb-6"><Input className="rounded-none max-w-[180px]" placeholder="标签，例如：都市" value={newTrend.label} onChange={e => setNewTrend({ ...newTrend, label: e.target.value })} /><Input className="rounded-none max-w-[180px]" placeholder="分类" value={newTrend.category} onChange={e => setNewTrend({ ...newTrend, category: e.target.value })} /><Input className="rounded-none max-w-[220px]" placeholder="趋势备注" value={newTrend.note} onChange={e => setNewTrend({ ...newTrend, note: e.target.value })} /><Button className="rounded-none" disabled={!newTrend.label || !newTrend.category} onClick={() => createTrend.mutate(newTrend)}><Plus className="mr-2 h-4 w-4" />加入标签</Button></div><div className="mb-6 border-l-2 border-accent pl-4 text-xs leading-6 text-muted-foreground">公开来源包括番茄分类/首页观察、抖音公开搜索和 B 站公开视频搜索；来源与局限已在表格中标注。</div><TrendTable trends={trends} /></CardContent></Card></TabsContent>`;
fs.writeFileSync(path, source.slice(0, start) + replacement + source.slice(end), "utf8");
