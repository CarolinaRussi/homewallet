import { z } from "zod";

export const createReservePotBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const updateReservePotBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export type CreateReservePotBody = z.infer<typeof createReservePotBodySchema>;
export type UpdateReservePotBody = z.infer<typeof updateReservePotBodySchema>;

export type ReservePotSummary = {
  id: string;
  name: string;
  balance: number;
};

export const DEFAULT_RESERVE_POT_NAME = "Poupancinha";
export const SAVING_CATEGORY_NAME = "Poupancinha";
