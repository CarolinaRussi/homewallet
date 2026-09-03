import { randomBytes } from "node:crypto";

export function createJoinCode(): string {
  return randomBytes(4).toString("hex");
}
