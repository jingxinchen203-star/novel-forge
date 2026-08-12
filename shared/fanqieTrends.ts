export const FANQIE_TREND_SOURCE = {
  title: "番茄小说公开页面观察样本",
  url: "https://fanqienovel.com/",
  collectedAt: "2026-08-13",
  methodology: "依据番茄小说公开首页的最近更新分类与作品标题，以及番茄作者榜单说明；不是平台实时完整榜单，不代表推荐或版权授权。",
} as const;

export const FANQIE_TREND_SAMPLES = [
  { label: "都市高武", category: "男频 / 都市", heat: 82, note: "公开首页最近更新样本：大一开学，病娇校花学姐馋我身子；觉醒空间异能，竟是残次天赋。" },
  { label: "历史脑洞", category: "男频 / 历史", heat: 78, note: "公开首页最近更新样本：大唐：我在御膳房偷偷开小灶。" },
  { label: "传统玄幻", category: "男频 / 玄幻", heat: 74, note: "公开首页最近更新样本：长庚照骨。" },
  { label: "双男主", category: "女频 / 纯爱", heat: 68, note: "公开首页最近更新样本：快穿：表面弱唧唧，背后黑漆漆！" },
  { label: "系统 / 脑洞爽文", category: "跨分类 / 脑洞", heat: 76, note: "行业扫文观察中反复出现的标签组合；用于写作方向参考，不等于实时榜单排名。" },
  { label: "穿越 / 快穿", category: "女频 / 穿越", heat: 72, note: "番茄公开榜单说明与行业观察中常见的分类组合；建议结合当天公开榜单复核。" },
] as const;
