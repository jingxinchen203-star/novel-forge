import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GenrePicker } from "../client/src/components/GenrePicker";
import { GENRE_OPTION_GROUPS, GENRE_OPTIONS, GENRE_SOURCE_NOTE } from "../shared/genreOptions";
import { canSaveProject, normalizeGenreInput } from "../shared/projectValidation";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("genre picker options", () => {
  it("includes grouped mainstream and public Fanqie sample genres without forcing a default", () => {
    expect(GENRE_OPTIONS).toContain("都市");
    expect(GENRE_OPTIONS).toContain("都市高武");
    expect(GENRE_OPTIONS).toContain("玄幻脑洞");
    expect(GENRE_OPTIONS).toContain("悬疑灵异");
    expect(GENRE_OPTIONS).toContain("双男主");
    expect(GENRE_OPTIONS).toContain("宫斗宅斗");
    expect(new Set(GENRE_OPTIONS).size).toBe(GENRE_OPTIONS.length);
    expect(GENRE_SOURCE_NOTE).toContain("自定义题材");
  });

  it("renders a searchable datalist with preset and custom input support", () => {
    const html = renderToStaticMarkup(React.createElement(GenrePicker, { value: "", onChange: () => undefined }));
    expect(html).toContain('list="novel-forge-genre-options"');
    expect(html).toContain("都市高武");
    expect(html).toContain("搜索或输入题材");
    const customHtml = renderToStaticMarkup(React.createElement(GenrePicker, { value: "蒸汽朋克探案", onChange: () => undefined }));
    expect(customHtml).toContain("自定义题材：蒸汽朋克探案");
  });

  it("models preset-to-custom input and form submit eligibility", () => {
    let genre = normalizeGenreInput("玄幻脑洞");
    expect(genre).toBe("玄幻脑洞");
    expect(canSaveProject("我的新书", genre)).toBe(true);
    genre = normalizeGenreInput("  蒸汽朋克探案  ");
    expect(genre).toBe("蒸汽朋克探案");
    expect(canSaveProject("我的新书", genre)).toBe(true);
    expect(canSaveProject("我的新书", "")).toBe(false);
    expect(canSaveProject("", "都市")).toBe(false);
  });

  it("wires the same picker into new and edit project forms", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    expect(source).toContain("const emptyProject = { title: \"\", genre: \"\"");
    expect(source).toContain("<GenrePicker value={projectForm.genre}");
    expect(source).toContain("<GenrePicker value={projectDraft.genre}");
    expect(GENRE_OPTION_GROUPS.length).toBeGreaterThanOrEqual(3);
  });
});
