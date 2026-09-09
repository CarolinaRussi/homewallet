import { z } from "zod";

const passcodeSchema = z
  .string()
  .min(8, "Passcode must be at least 8 characters")
  .max(128, "Passcode must be at most 128 characters");

export const registerBodySchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: passcodeSchema,
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z
    .string()
    .min(1, "Passcode is required")
    .max(128, "Passcode must be at most 128 characters"),
});

export const googleBodySchema = z.object({
  idToken: z.string().min(1, "Google sign-in failed"),
});

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email("Invalid email"),
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Invalid or expired reset link"),
  password: passcodeSchema,
});

export const verifyEmailBodySchema = z.object({
  token: z.string().min(1, "Invalid or expired verify link"),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type GoogleBody = z.infer<typeof googleBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  googleLinked: boolean;
};
