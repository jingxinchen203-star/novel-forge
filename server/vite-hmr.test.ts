import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

describe("Vite HMR proxy configuration", () => {
  it("builds the published app with an explicit production environment", () => {
    expect(packageJson.scripts.build).toContain("NODE_ENV=production vite build");
    expect(packageJson.scripts.build).toContain("NODE_ENV=production esbuild");
  });

  it("uses the public HTTPS WebSocket endpoint for Manus previews", () => {
    const source = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    expect(source).toContain('protocol: "wss"');
    expect(source).toContain("clientPort: 443");
    expect(source).toContain("instead of localhost:5173");
  });

  it("preserves public HMR settings in the Express Vite bridge", () => {
    const source = readFileSync(resolve(process.cwd(), "server/_core/vite.ts"), "utf8");
    expect(source).toContain("configuredHmr");
    expect(source).toContain("typeof configuredHmr === \"object\"");
    expect(source).toContain("server,");
  });

  it("does not manually split React and react-dom into circular vendor chunks", () => {
    const source = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    expect(source).not.toContain('return "react-vendor"');
    expect(source).not.toContain('return "react-dom-vendor"');
  });
});
