import { z } from "zod";
import { claimCodeSchema } from "@/server/validators/delivery";

export const gameTypeSchema = z.enum([
  "MM2",
  "ADOPT_ME",
  "SAB",
  "GAG2",
  "OTHER",
]);

export const orderItemInputSchema = z.object({
  productId: z.string().trim().min(1, "Product is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(999),
});

export const createTestOrderSchema = z.object({
  game: gameTypeSchema,
  robloxUsername: z
    .string()
    .trim()
    .max(64, "Username must be at most 64 characters")
    .optional()
    .transform((value) => value || undefined),
  items: z
    .array(orderItemInputSchema)
    .min(1, "Select at least one product")
    .max(50, "Too many line items"),
});

export type CreateTestOrderInput = z.infer<typeof createTestOrderSchema>;

export const claimLookupSchema = z.object({
  claimCode: claimCodeSchema,
});

export type ClaimLookupInput = z.infer<typeof claimLookupSchema>;

export const claimContinueSchema = z.object({
  claimCode: claimCodeSchema,
  robloxUsername: z
    .string()
    .trim()
    .min(3, "Roblox username must be at least 3 characters")
    .max(64, "Roblox username must be at most 64 characters")
    .regex(
      /^[A-Za-z0-9_]+$/,
      "Username may only contain letters, numbers, and underscores"
    ),
});

export type ClaimContinueInput = z.infer<typeof claimContinueSchema>;
