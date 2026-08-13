import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState } from "@shared/const";
import { isAllowedOrigin } from "./_core/security";

describe("Cloudflare Pages origin integration", () => {
  it("accepts the configured Pages origin and rejects an unrelated origin", () => {
    expect(isAllowedOrigin("https://novel-forge-cxf.pages.dev")).toBe(true);
    expect(isAllowedOrigin("https://example.invalid")).toBe(false);
    expect(isAllowedOrigin("not a url")).toBe(false);
  });

  it("round-trips the Pages return URL through OAuth state", () => {
    const state = encodeOAuthState({
      redirectUri: "https://novelforge-gytesvpi.manus.space/api/oauth/callback",
      nonce: "test-nonce",
      returnTo: "https://novel-forge-cxf.pages.dev/#workspace",
    });
    expect(decodeOAuthState(state)).toEqual({
      redirectUri: "https://novelforge-gytesvpi.manus.space/api/oauth/callback",
      nonce: "test-nonce",
      returnTo: "https://novel-forge-cxf.pages.dev/#workspace",
    });
  });
});
