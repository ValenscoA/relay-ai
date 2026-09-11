import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { decryptSecret, encryptSecret } from "./crypto";
beforeEach(()=>{process.env.APP_ENCRYPTION_KEY=Buffer.alloc(32,7).toString("base64")});
describe("credential encryption",()=>{it("round trips with authenticated encryption",()=>{const encrypted=encryptSecret("sk-private");expect(encrypted).not.toContain("sk-private");expect(decryptSecret(encrypted)).toBe("sk-private")});it("rejects tampering",()=>{const encrypted=encryptSecret("sk-private");expect(()=>decryptSecret(`${encrypted.slice(0,-1)}x`)).toThrow()})});
