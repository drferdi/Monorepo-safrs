import { z } from "zod";

export const createDemoInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const demoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  correlationId: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
