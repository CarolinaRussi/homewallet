import { z } from "zod";

export const SPACE_CURRENCIES = ["BRL", "USD", "EUR"] as const;
export const SPACE_PRIVACY_MODES = ["private", "transparent"] as const;
export const MEMBERSHIP_ROLES = ["owner", "member"] as const;
export const ENTRY_DATE_MODES = ["month", "day"] as const;

export type SpaceCurrency = (typeof SPACE_CURRENCIES)[number];
export type SpacePrivacyMode = (typeof SPACE_PRIVACY_MODES)[number];
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];
export type EntryDateMode = (typeof ENTRY_DATE_MODES)[number];

export const createSpaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  currency: z.enum(SPACE_CURRENCIES).default("BRL"),
  entryDateMode: z.enum(ENTRY_DATE_MODES).default("month"),
});

export const joinSpaceBodySchema = z.object({
  joinCode: z.string().trim().min(8).max(16),
});

export const updateSpaceBodySchema = z.object({
  entryDateMode: z.enum(ENTRY_DATE_MODES),
});

export type CreateSpaceBody = z.input<typeof createSpaceBodySchema>;
export type JoinSpaceBody = z.infer<typeof joinSpaceBodySchema>;
export type UpdateSpaceBody = z.infer<typeof updateSpaceBodySchema>;

export type SpaceSummary = {
  id: string;
  name: string;
  currency: SpaceCurrency;
  privacyMode: SpacePrivacyMode;
  entryDateMode: EntryDateMode;
  role: MembershipRole;
  joinCode: string;
};
