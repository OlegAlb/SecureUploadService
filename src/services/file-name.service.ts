import crypto from "crypto";

export function generateSafeFileName(): string {
  return crypto.randomBytes(32).toString("hex");
}
