import { z } from "zod";

const PRODUCTION_MIN_PASSWORD_LENGTH = 8;

/** Relaxed in `next dev`; production keeps 8+ (Better Auth + Zod aligned). */
export const minPasswordLength =
  process.env.NODE_ENV === "development" ? 1 : PRODUCTION_MIN_PASSWORD_LENGTH;

/** New passwords (setup, change) — production enforces 8+. */
export const passwordFieldSchema = (label = "Password"): z.ZodString => {
  if (minPasswordLength <= 1) {
    return z.string().min(1, `${label} is required`);
  }

  return z
    .string()
    .min(
      minPasswordLength,
      `${label} must be at least ${minPasswordLength} characters`,
    );
};

/** Sign-in only — length was enforced when the password was set. */
export const loginPasswordFieldSchema = (label = "Password"): z.ZodString =>
  z.string().min(1, `${label} is required`);
