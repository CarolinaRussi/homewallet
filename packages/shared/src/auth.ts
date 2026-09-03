import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(80),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const googleBodySchema = z.object({
  idToken: z.string().min(1),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type GoogleBody = z.infer<typeof googleBodySchema>;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};
