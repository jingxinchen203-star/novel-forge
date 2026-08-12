import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  utils: { projects: { list: { invalidate: vi.fn() } }, trends: { list: { invalidate: vi.fn() } }, notifications: { list: { invalidate: vi.fn() } }, workspace: { get: { invalidate: vi.fn() } } },
  mutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => mocks.utils,
    projects: {
      list: { useQuery: () => ({ data: [], isLoading: false }) },
      create: { useMutation: () => mocks.mutation() },
      optimizeSynopsis: { useMutation: () => mocks.mutation() },
      remove: { useMutation: () => mocks.mutation() },
    },
    trends: { list: { useQuery: () => ({ data: [] }) } },
    notifications: { list: { useQuery: () => ({ data: [] }) }, markRead: { useMutation: () => mocks.mutation() } },
    workspace: { get: { useQuery: () => ({ data: undefined }) } },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Home from "../client/src/pages/Home";

describe("Home navigation branches without a project", () => {
  beforeEach(() => {
    (globalThis as any).window = { location: { hash: "" }, addEventListener: vi.fn(), removeEventListener: vi.fn(), setTimeout };
  });

  it.each([["#trends", "题材趋势库", "多平台公开观察"], ["#versions", "版本档案", "请先建立或选择一部小说"], ["#schedule", "续写计划", "请先建立或选择一部小说"]] as const)("renders %s as an independent Home panel", (hash, title, marker) => {
    (globalThis as any).window.location.hash = hash;
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain(title);
    expect(html).toContain(marker);
  });
});
