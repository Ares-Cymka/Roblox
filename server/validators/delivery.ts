import { z } from "zod";

export const claimCodeSchema = z
  .string()
  .trim()
  .min(6, "Claim code must be at least 6 characters")
  .max(32, "Claim code must be at most 32 characters")
  .regex(/^[A-Za-z0-9-]+$/, "Claim code contains invalid characters");

export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const createDeliverySchema = z.object({
  productName: z.string().trim().min(1, "Product name is required").max(200),
  claimCode: claimCodeSchema.optional(),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

export const markDeliveryFailedSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Failure reason must be at least 3 characters")
    .max(500),
});

export type MarkDeliveryFailedInput = z.infer<typeof markDeliveryFailedSchema>;
