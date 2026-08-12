/**
 * OH Story method pack adapted from worldwonderer/oh-story-claudecode.
 * Source: https://github.com/worldwonderer/oh-story-claudecode
 * License: MIT. This file contains a project-specific paraphrase, not executable
 * external hooks or agents.
 */

export const OH_STORY_METHOD = {
  source: "oh-story-claudecode",
  sourceUrl: "https://github.com/worldwonderer/oh-story-claudecode",
  version: "0.7.5",
  license: "MIT",
  principles: [
    "先明确本章要交付的核心情绪，再决定事件、冲突和章末钩子。",
    "把趋势当作候选信号：需要跨作品、跨样本和平台指标重复验证，不能根据单本排名断言爆款。",
    "用剧情功能位和可复用模块组织故事，但必须替换为用户自己的世界观、人物和素材。",
    "写每章只召回会影响连续性的设定、角色状态、伏笔和上一章结果，避免把整本书无差别塞进提示词。",
    "开书先完成选题、核心设定和章节细纲；没有明确写作范围时，不自动批量生成正文。",
    "正文生成后进行连续性、情绪兑现、节奏、移动端可读性和机械化表达检查。",
  ],
  outlinePrompt: `采用 OH Story 长篇方法：先确认本章/本卷的情绪目标，再安排事件推进、冲突升级和章末钩子。大纲必须给出可执行的章节定位、核心事件、读者预期、情绪兑现、伏笔/信息推进和下一章牵引；不要只写空泛梗概。趋势只能作为候选参考，不得把单本排名当作确定性结论。`,
  prosePrompt: `采用 OH Story 长篇方法：正文必须服务于本章情绪目标和章节定位，围绕细纲推进，不擅自改变人物代理权、世界规则或已发生事实。只使用当前章节必要的设定与状态；结尾留下明确的推进动力。输出适合移动端阅读的中文网文正文，不解释写作过程，不伪造数据或引用来源。`,
  trendPrompt: `采用 OH Story 扫榜方法：把单本排名视为线索，把跨样本重复出现的题材、标签、开篇卖点、人物功能位和节奏模式视为更强信号。分析时区分平台核心指标，明确样本数量、数据质量、趋势置信度、可行性、失败风险和下一步验证动作。`,
} as const;

export function buildOhStorySystemPrompt(base: string, extension: string) {
  return `${base}\n\n${extension}\n\n方法来源：${OH_STORY_METHOD.source} v${OH_STORY_METHOD.version}（MIT，已做项目内方法论改写）。`;
}
