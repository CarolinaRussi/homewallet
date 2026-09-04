import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(8, "Passcode must be at least 8 characters"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Passcode is required"),
});

export const googleBodySchema = z.object({
  idToken: z.string().min(1, "Google sign-in failed"),
});

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email("Invalid email"),
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Invalid or expired reset link"),
  password: z.string().min(8, "Passcode must be at least 8 characters"),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type GoogleBody = z.infer<typeof googleBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};
