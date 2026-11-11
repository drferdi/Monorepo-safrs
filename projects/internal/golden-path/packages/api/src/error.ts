import { apiErrorSchema } from "@safrs/schemas";
import { z } from "zod";
import type { $ZodError } from "zod/v4/core";

export type ApiError = z.infer<typeof apiErrorSchema>;

export function internalError(correlationId: string): ApiError {
  return apiErrorSchema.parse({
    code: "INTERNAL_ERROR",
    correlationId,
    message: "Terjadi kesalahan internal.",
  });
}

export function validationError(
  error: $ZodError,
  correlationId: string,
): ApiError {
  const { fieldErrors } = z.flattenError(error);
  const normalizedFieldErrors: Record<string, string[]> = {};

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      normalizedFieldErrors[field] = messages.filter(
        (message): message is string => typeof message === "string",
      );
    }
  }

  return apiErrorSchema.parse({
    code: "VALIDATION_ERROR",
    correlationId,
    fieldErrors:
      Object.keys(normalizedFieldErrors).length > 0
        ? normalizedFieldErrors
        : undefined,
    message: "Permintaan tidak valid.",
  });
}
