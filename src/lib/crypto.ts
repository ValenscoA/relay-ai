import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() { const value = process.env.APP_ENCRYPTION_KEY; if (!value) throw new Error("APP_ENCRYPTION_KEY is not configured"); const decoded = Buffer.from(value, "base64"); if (decoded.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes encoded as base64"); return decoded; }
export function encryptSecret(plain: string) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv); const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]); return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join("."); }
export function decryptSecret(value: string) { const [version, iv, tag, data] = value.split("."); if (version !== "v1" || !iv || !tag || !data) throw new Error("Invalid encrypted secret"); const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8"); }
