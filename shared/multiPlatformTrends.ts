export type TrendPlatform = "番茄" | "抖音" | "B站" | "我的标签";
export type TrendConfidence = "高" | "中" | "低";

export type PublicTrendObservation = {
  id: string;
  platform: Exclude<TrendPlatform, "我的标签">;
  observationType: string;
  title: string;
  genre: string;
  metricLabel: string;
  metricValue: number | null;
  confidence: TrendConfidence;
  collectedAt: string;
  sourceUrl: string;
  note: string;
};

export const MULTI_PLATFORM_TREND_SOURCES = [
  { platform: "番茄" as const, title: "番茄公开首页与分类榜单说明", url: "https://fanqienovel.com/writer/zone/article/7211409457698308157", collectedAt: "2026-08-13", note: "公开分类与观察样本，不代表平台实时完整榜单。" },
  { platform: "抖音" as const, title: "抖音公开小说搜索观察", url: "https://www.douyin.com/search/%E5%90%84%E7%A7%8D%E7%B1%BB%E6%96%87%E5%B0%8F%E8%AF%B4", collectedAt: "2026-08-13", note: "搜索结果受登录、推荐和动态页面影响，非全量榜单。" },
  { platform: "B站" as const, title: "B站网络文学排行公开搜索", url: "https://search.bilibili.com/all?keyword=%E7%BD%91%E7%BB%9C%E6%96%87%E5%AD%A6%E6%8E%92%E8%A1%8C", collectedAt: "2026-08-13", note: "按公开视频搜索结果观察，不等同于小说平台销量榜。" },
] as const;

export const PUBLIC_TREND_OBSERVATIONS: PublicTrendObservation[] = [
  { id: "fanqie-urban-high-martial", platform: "番茄", observationType: "公开分类/首页样本", title: "都市高武", genre: "都市·高武", metricLabel: "观察热度", metricValue: 82, confidence: "中", collectedAt: "2026-08-13", sourceUrl: MULTI_PLATFORM_TREND_SOURCES[0].url, note: "公开首页最近更新题名归纳；不是实时排名。" },
  { id: "fanqie-history-brainstorm", platform: "番茄", observationType: "公开分类/首页样本", title: "历史脑洞", genre: "历史·脑洞", metricLabel: "观察热度", metricValue: 78, confidence: "中", collectedAt: "2026-08-13", sourceUrl: MULTI_PLATFORM_TREND_SOURCES[0].url, note: "从公开分类和作品题名归纳出的写作方向。" },
  { id: "fanqie-traditional-fantasy", platform: "番茄", observationType: "公开分类/首页样本", title: "传统玄幻", genre: "玄幻·成长", metricLabel: "观察热度", metricValue: 74, confidence: "中", collectedAt: "2026-08-13", sourceUrl: MULTI_PLATFORM_TREND_SOURCES[0].url, note: "公开分类观察样本，需结合当天页面复核。" },
  { id: "fanqie-dual-male", platform: "番茄", observationType: "公开分类/首页样本", title: "双男主", genre: "纯爱·双男主", metricLabel: "观察热度", metricValue: 68, confidence: "中", collectedAt: "2026-08-13", sourceUrl: MULTI_PLATFORM_TREND_SOURCES[0].url, note: "分类组合观察，不代表平台推荐排序。" },
  { id: "douyin-sweet-pet", platform: "抖音", observationType: "公开搜索观察", title: "甜宠/虐文/重生", genre: "现代言情·情感钩子", metricLabel: "公开搜索", metricValue: null, confidence: "低", collectedAt: "2026-08-13", sourceUrl: MULTI_PLATFORM_TREND_SOURCES[1].url, note: "公开搜索页可见的题材关键词组合，缺少统一可比指标。" },
  { id: "douyin-short-drama", platform: "抖音", observationType: "公开搜索观察", title: "短剧化小说题材", genre: "短剧·强冲突", metricLabel: "公开搜索", metricValue: null, confidence: "低", collectedAt: "2026-08-13", sourceUrl: "https://www.douyin.com/search/%E7%95%AA%E8%8C%84%E5%B0%8F%E8%AF%B4%E7%9F%AD%E5%89%A7%E6%9C%80%E7%83%AD%E6%A6%9C%E5%89%8D%E5%8D%81%E5%90%8D", note: "短剧相关搜索入口，不把视频播放量外推为小说热度。" },
  { id: "douyin-scifi", platform: "抖音", observationType: "公开搜索观察", title: "科幻小说", genre: "科幻·设定驱动", metricLabel: "公开搜索", metricValue: null, confidence: "低", collectedAt: "2026-08-13", sourceUrl: "https://www.douyin.com/search/%E7%A7%91%E5%B9%BB%E5%B0%8F%E8%AF%B4%E9%94%80%E9%87%8F%E6%8E%92%E8%A1%8C", note: "公开搜索主题样本，未发现可直接核验的统一销量榜数据。" },
  { id: "bili-wuxia-harem", platform: "B站", observationType: "视频搜索结果", title: "类似偷香高手的武侠后宫文", genre: "武侠·后宫", metricLabel: "播放", metricValue: 30000, confidence: "中", collectedAt: "2026-08-13", sourceUrl: "https://www.bilibili.com/video/BV1Rv41157Gi/", note: "公开视频搜索结果；指标属于视频内容，不是小说销量。" },
  { id: "bili-xianxia-list", platform: "B站", observationType: "视频搜索结果", title: "年度书单分享：热门仙侠", genre: "仙侠·书单", metricLabel: "播放", metricValue: 454000, confidence: "中", collectedAt: "2026-08-13", sourceUrl: "https://www.bilibili.com/video/BV1wSz6BSEXs/", note: "视频搜索结果显示的播放与弹幕观察样本。" },
  { id: "bili-high-martial", platform: "B站", observationType: "视频搜索结果", title: "主角超贱小说盘点：全球高武", genre: "高武·爽文", metricLabel: "播放", metricValue: 42000, confidence: "中", collectedAt: "2026-08-13", sourceUrl: "https://www.bilibili.com/video/BV1RV411E7fT/", note: "视频标题中的题材标签，不代表全站小说排行。" },
  { id: "bili-urban-fantasy", platform: "B站", observationType: "视频搜索结果", title: "番茄热门小说点评", genre: "都市·综合爽文", metricLabel: "播放", metricValue: 1037, confidence: "低", collectedAt: "2026-08-13", sourceUrl: "https://search.bilibili.com/all?keyword=%E7%BD%91%E7%BB%9C%E6%96%87%E5%AD%A6%E6%8E%92%E8%A1%8C", note: "搜索页样本；标题与指标会随页面变化。" },
];
