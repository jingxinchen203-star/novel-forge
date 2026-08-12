export type GenreOptionGroup = {
  label: string;
  options: string[];
};

export const GENRE_OPTION_GROUPS: GenreOptionGroup[] = [
  { label: "常用主类", options: ["都市", "言情", "玄幻", "历史", "悬疑", "科幻", "武侠", "游戏竞技", "现实题材"] },
  { label: "番茄公开细分样本", options: ["都市高武", "都市脑洞", "豪门总裁", "历史古代", "历史脑洞", "宫斗宅斗", "传统玄幻", "玄幻脑洞", "悬疑脑洞", "悬疑灵异", "双男主", "快穿", "穿越", "末世", "系统爽文"] },
  { label: "常见组合方向", options: ["都市异能", "年代重生", "神医赘婿", "修仙升级", "无限流", "灵异惊悚", "黑科技", "种田经营", "甜宠先婚后爱", "娱乐圈", "网游副本"] },
];

export const GENRE_OPTIONS = GENRE_OPTION_GROUPS.flatMap(group => group.options);

export const GENRE_SOURCE_NOTE = "选项依据番茄公开作者福利页、公开首页最近更新分类与官方分类榜单说明整理；不是平台后台完整分类，支持自定义题材。";
