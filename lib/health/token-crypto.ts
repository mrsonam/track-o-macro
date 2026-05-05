import { createHash, randomBytes } from "crypto";

const PREFIX = "tom_hst_";

/** One-time plaintext token for Shortcuts (store only hash server-side). */
export function generateHealthSyncTokenPlaintext(): string {
  return `${PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashHealthSyncToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function isLikelyHealthSyncToken(plaintext: string): boolean {
  return plaintext.startsWith(PREFIX) && plaintext.length > PREFIX.length + 8;
}
