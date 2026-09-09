import { randomBytes } from "node:crypto";

export function createJoinCode(): string {
  return randomBytes(8).toString("hex");
}
