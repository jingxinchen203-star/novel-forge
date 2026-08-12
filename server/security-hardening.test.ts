import { describe, expect, it } from "vitest";
import { acquireGenerationLock, consumeGenerationSlot, hasTrustedMutationOrigin, releaseGenerationLock } from "./_core/security";

function request(headers: Record<string, string>) {
  return { headers } as never;
}

describe("security hardening", () => {
  it("accepts same-origin browser mutations and rejects cross-origin mutations", () => {
    expect(hasTrustedMutationOrigin(request({ origin: "https://novel.example", host: "novel.example" }))).toBe(true);
    expect(hasTrustedMutationOrigin(request({ origin: "https://attacker.example", host: "novel.example" }))).toBe(false);
    expect(hasTrustedMutationOrigin(request({ host: "novel.example" }))).toBe(false);
  });

  it("rejects bearer-looking requests without a same-origin signal", () => {
    expect(hasTrustedMutationOrigin(request({ authorization: "Bearer test-token" }))).toBe(false);
  });

  it("limits generation slots and releases project locks", () => {
    const userId = 901;
    const projectId = 902;
    expect(acquireGenerationLock(userId, projectId)).toBe(true);
    expect(acquireGenerationLock(userId, projectId)).toBe(false);
    releaseGenerationLock(userId, projectId);
    expect(acquireGenerationLock(userId, projectId)).toBe(true);
    releaseGenerationLock(userId, projectId);
    expect(consumeGenerationSlot(userId, projectId)).toBe(true);
    expect(consumeGenerationSlot(userId, projectId)).toBe(true);
    expect(consumeGenerationSlot(userId, projectId)).toBe(true);
    expect(consumeGenerationSlot(userId, projectId)).toBe(false);
  });
});
