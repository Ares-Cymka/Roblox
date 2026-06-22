import { z } from "zod";

export const gameTypeSchema = z.enum(["MM2", "ADOPT_ME", "SAB", "GAG2", "OTHER"]);

export const botStatusSchema = z.enum(["ONLINE", "OFFLINE", "BUSY", "DISABLED"]);

export const createBotAccountSchema = z.object({
  game: gameTypeSchema,
  robloxUsername: z
    .string()
    .trim()
    .min(1, "Roblox username is required")
    .max(64),
  robloxUserId: z.string().trim().max(64).optional().or(z.literal("")),
  profileUrl: z.string().trim().url("Profile URL must be valid").optional().or(z.literal("")),
  privateServerUrl: z.string().trim().url("Private server URL must be valid").optional().or(z.literal("")),
  status: botStatusSchema.default("OFFLINE"),
  maxConcurrentDeliveries: z.coerce.number().int().min(1).max(20).default(1),
});

export const updateBotAccountSchema = createBotAccountSchema.partial();

export const upsertBotInventorySchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().min(0),
  reservedQuantity: z.coerce.number().int().min(0).default(0),
});

export const updateBotInventorySchema = z.object({
  quantity: z.coerce.number().int().min(0).optional(),
  reservedQuantity: z.coerce.number().int().min(0).optional(),
});

export type CreateBotAccountInput = z.infer<typeof createBotAccountSchema>;
export type UpdateBotAccountInput = z.infer<typeof updateBotAccountSchema>;
export type UpsertBotInventoryInput = z.infer<typeof upsertBotInventorySchema>;
