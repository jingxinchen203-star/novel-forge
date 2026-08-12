import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { filterAndSortTrendRows, TrendTable, type TrendRow } from "../client/src/components/TrendTable";
import { MULTI_PLATFORM_TREND_SOURCES, PUBLIC_TREND_OBSERVATIONS } from "../shared/multiPlatformTrends";

describe("multi-platform trend library", () => {
  it("keeps platform sources and observation rows traceable", () => {
    expect(MULTI_PLATFORM_TREND_SOURCES.map(source => source.platform)).toEqual(["番茄", "抖音", "B站"]);
    expect(new Set(PUBLIC_TREND_OBSERVATIONS.map(item => item.id)).size).toBe(PUBLIC_TREND_OBSERVATIONS.length);
    for (const item of PUBLIC_TREND_OBSERVATIONS) {
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.collectedAt).toBe("2026-08-13");
      expect(["高", "中", "低"]).toContain(item.confidence);
    }
  });

  it("filters and sorts rows by platform, query, confidence, threshold and date", () => {
    const rows: TrendRow[] = [
      { id: "a", platform: "番茄", observationType: "公开", title: "都市高武", genre: "都市", metricLabel: "热度", metricValue: 82, confidence: "中", collectedAt: "2026-08-13", note: "alpha" },
      { id: "b", platform: "B站", observationType: "视频", title: "热门仙侠书单", genre: "仙侠", metricLabel: "播放", metricValue: 45, confidence: "低", collectedAt: "2026-08-12", note: "beta" },
      { id: "c", platform: "抖音", observationType: "搜索", title: "科幻小说", genre: "科幻", metricLabel: "搜索", metricValue: null, confidence: "低", collectedAt: "2026-08-14", note: "gamma" },
    ];
    expect(filterAndSortTrendRows(rows, { platform: "番茄", confidence: "全部", query: "高武", heatThreshold: "全部", sortBy: "heat" }).map(row => row.id)).toEqual(["a"]);
    expect(filterAndSortTrendRows(rows, { platform: "全部", confidence: "低", query: "", heatThreshold: "40", sortBy: "date" }).map(row => row.id)).toEqual(["b"]);
    expect(filterAndSortTrendRows(rows, { platform: "全部", confidence: "全部", query: "", heatThreshold: "全部", sortBy: "date" }).map(row => row.id)).toEqual(["c", "a", "b"]);
  });

  it("renders the table with filters, public sources and user labels", () => {
    const html = renderToStaticMarkup(React.createElement(TrendTable, { trends: [{ id: 7, label: "我的末世标签", category: "科幻", heat: 61, note: "用户备注" }] }));
    expect(html).toContain("筛选趋势观察");
    expect(html).toContain("番茄");
    expect(html).toContain("抖音");
    expect(html).toContain("B站");
    expect(html).toContain("我的标签");
    expect(html).toContain("我的末世标签");
    expect(html).toContain("来源");
    expect(html).toContain("编辑");
    expect(html).toContain("删除");
  });
});
