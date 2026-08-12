import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SynopsisFields } from "../client/src/components/SynopsisFields";
import { buildProjectCreateInput } from "../shared/projectForm";

describe("new project synopsis fields", () => {
  it("renders rough idea and editable final synopsis as separate fields", () => {
    const html = renderToStaticMarkup(<SynopsisFields idea="厨师听见食材心声" synopsis="优化后的发布页简介" onIdeaChange={() => undefined} onSynopsisChange={() => undefined} />);
    expect(html).toContain('aria-label="粗略想法"');
    expect(html).toContain('aria-label="最终简介"');
    expect(html).toContain("厨师听见食材心声");
    expect(html).toContain("优化后的发布页简介");
  });

  it("submits the manually edited final synopsis while preserving the rough idea separately", () => {
    const roughIdea = "厨师听见食材心声";
    const editedFinalSynopsis = "失业厨师意外听见食材心声，从一座旧菜市场开始追查一场被掩盖的秘密。";
    const payload = buildProjectCreateInput({ title: "听见锅铲的人", genre: "都市脑洞", synopsis: editedFinalSynopsis, targetWords: 100000 });
    expect(payload.synopsis).toBe(editedFinalSynopsis);
    expect(payload.synopsis).not.toBe(roughIdea);
  });
});
