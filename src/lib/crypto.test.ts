import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { decryptSecret, encryptSecret } from "./crypto";
beforeEach(() => {
  process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});
describe("credential encryption", () => {
  it("round trips with authenticated encryption", () => {
    const encrypted = encryptSecret("sk-private");
    expect(encrypted).not.toContain("sk-private");
    expect(decryptSecret(encrypted)).toBe("sk-private");
  });
  it("rejects tampering", () => {
    const parts = encryptSecret("sk-private").split(".");
    parts[3] = `${parts[3].startsWith("A") ? "B" : "A"}${parts[3].slice(1)}`;
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
});
