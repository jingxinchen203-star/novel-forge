import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Vite HMR proxy configuration", () => {
  it("uses the public HTTPS WebSocket endpoint for Manus previews", () => {
    const source = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    expect(source).toContain('protocol: "wss"');
    expect(source).toContain("clientPort: 443");
    expect(source).toContain("instead of localhost:5173");
  });
});
