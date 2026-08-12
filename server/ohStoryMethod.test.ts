import { describe, expect, it } from "vitest";
import { chapterSystemPrompt, outlineSystemPrompt } from "./routers";
import { OH_STORY_METHOD } from "@shared/ohStoryMethod";

describe("OH Story method pack integration", () => {
  it("injects the outline contract into generateOutline's system prompt", () => {
    const prompt = outlineSystemPrompt();
    expect(prompt).toContain("情绪目标");
    expect(prompt).toContain("章末钩子");
    expect(prompt).toContain("单本排名");
    expect(prompt).toContain(`方法来源：${OH_STORY_METHOD.source} v${OH_STORY_METHOD.version}`);
  });

  it("injects continuity and emotional payoff constraints into generateChapter's system prompt", () => {
    const prompt = chapterSystemPrompt();
    expect(prompt).toContain("情绪目标");
    expect(prompt).toContain("不擅自改变人物代理权、世界规则或已发生事实");
    expect(prompt).toContain("当前章节必要的设定与状态");
    expect(prompt).toContain("移动端阅读");
  });
});
