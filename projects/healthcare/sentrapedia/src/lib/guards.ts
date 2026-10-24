// Shape checks for stored and received JSON. `record` rejects arrays; `objectLike` accepts them (the evidence gate relies on that).
export const objectLike = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";
export const record = (value: unknown): value is Record<string, unknown> => objectLike(value) && !Array.isArray(value);
// `text` allows blank strings; `filledText` needs at least one non-blank character.
export const text = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
export const filledText = (value: unknown, max: number): value is string => text(value, max) && !!value.trim();
