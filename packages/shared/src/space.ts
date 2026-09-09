import { z } from "zod";
import type { MyLimitSettings } from "./limits.js";

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

export const inviteSpaceEmailBodySchema = z.object({
  email: z.string().trim().email(),
});

export const updateSpaceBodySchema = z
  .object({
    entryDateMode: z.enum(ENTRY_DATE_MODES).optional(),
    privacyMode: z.enum(SPACE_PRIVACY_MODES).optional(),
    spaceLimitEnabled: z.boolean().optional(),
    spaceLimitAmount: z.coerce
      .number()
      .positive()
      .finite()
      .nullable()
      .optional(),
    budgetLayersEnabled: z.boolean().optional(),
  })
  .refine(
    (body) => Object.keys(body).length > 0,
    "Provide at least one setting"
  );

export type CreateSpaceBody = z.input<typeof createSpaceBodySchema>;
export type JoinSpaceBody = z.infer<typeof joinSpaceBodySchema>;
export type InviteSpaceEmailBody = z.infer<typeof inviteSpaceEmailBodySchema>;
export type UpdateSpaceBody = z.infer<typeof updateSpaceBodySchema>;

export type SpaceMemberSummary = {
  userId: string;
  name: string;
  email: string;
  role: MembershipRole;
  joinedAt: string;
};

export type SpaceSummary = {
  id: string;
  name: string;
  currency: SpaceCurrency;
  privacyMode: SpacePrivacyMode;
  entryDateMode: EntryDateMode;
  role: MembershipRole;
  joinCode: string | null;
  spaceLimitEnabled: boolean;
  spaceLimitAmount: number | null;
  budgetLayersEnabled: boolean;
  myLimits: MyLimitSettings;
};
