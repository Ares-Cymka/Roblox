import { z } from "zod";

export const inventoryLookupSchema = z
  .object({
    sessionId: z.string().trim().min(1).optional(),
    testCode: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((value) => value.sessionId || value.testCode || value.email, {
    message: "sessionId, testCode, or email is required",
  });

export const createWithdrawalSchema = z.object({
  sessionId: z.string().trim().optional(),
  testCode: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        inventoryId: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1).max(999),
      })
    )
    .min(1, "Select at least one item"),
});

export const withdrawalUsernameSchema = z.object({
  robloxUsername: z
    .string()
    .trim()
    .min(3, "Roblox username must be at least 3 characters")
    .max(64)
    .regex(/^[A-Za-z0-9_]+$/, "Invalid Roblox username"),
});

export const botAssignmentActionSchema = z.object({
  botAssignmentId: z.string().trim().min(1, "botAssignmentId is required"),
});

export const createCustomerInventorySchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(9999),
  customerId: z.string().trim().optional(),
  sessionId: z.string().trim().optional(),
  testCode: z.string().trim().optional(),
  sourceOrderId: z.string().trim().optional(),
});

export const updateGameConfigSchema = z.object({
  deliveryMethod: z
    .enum(["TRADING", "GIFTING", "MAILBOX", "JOIN_BASED", "MANUAL"])
    .optional(),
  requiresFriend: z.boolean().optional(),
  requiresPrivateServer: z.boolean().optional(),
  requiresCustomerJoin: z.boolean().optional(),
  requiresManualConfirmation: z.boolean().optional(),
  instructions: z.string().trim().optional().nullable(),
});
