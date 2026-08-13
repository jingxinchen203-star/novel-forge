import { describe, expect, it } from "vitest";
import { canGenerateOutline, normalizeStoryDirection } from "../shared/storyDirection";

describe("story direction validation", () => {
  it("rejects empty and whitespace-only directions", () => {
    expect(canGenerateOutline("")).toBe(false);
    expect(canGenerateOutline("   \n\t  ")).toBe(false);
  });

  it("trims valid directions before submission", () => {
    expect(normalizeStoryDirection("  末世城市中寻找失踪妹妹  ")).toBe("末世城市中寻找失踪妹妹");
    expect(canGenerateOutline("  末世城市中寻找失踪妹妹  ")).toBe(true);
  });
});
