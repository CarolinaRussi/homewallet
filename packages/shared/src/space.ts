import { z } from "zod";

export const SPACE_CURRENCIES = ["BRL", "USD", "EUR"] as const;
export const SPACE_PRIVACY_MODES = ["private", "transparent"] as const;
export const MEMBERSHIP_ROLES = ["owner", "member"] as const;

export type SpaceCurrency = (typeof SPACE_CURRENCIES)[number];
export type SpacePrivacyMode = (typeof SPACE_PRIVACY_MODES)[number];
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const createSpaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  currency: z.enum(SPACE_CURRENCIES).default("BRL"),
});

export const joinSpaceBodySchema = z.object({
  joinCode: z.string().trim().min(8).max(16),
});

export type CreateSpaceBody = z.infer<typeof createSpaceBodySchema>;
export type JoinSpaceBody = z.infer<typeof joinSpaceBodySchema>;

export type SpaceSummary = {
  id: string;
  name: string;
  currency: SpaceCurrency;
  privacyMode: SpacePrivacyMode;
  role: MembershipRole;
  joinCode: string;
};
