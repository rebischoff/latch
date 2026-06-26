import {
  LATCH_AUTH_EMAIL_SUFFIX,
  authCredentialLookupKeys,
  toAuthCredentialEmail,
} from "@latch/adapter-better-auth";

export { LATCH_AUTH_EMAIL_SUFFIX, authCredentialLookupKeys, toAuthCredentialEmail };

const DEFAULT_CALLBACK_URL = "/";

export const sanitizeCallbackUrl = (
  url: string | null | undefined,
): string => {
  if (!url) {
    return DEFAULT_CALLBACK_URL;
  }

  const trimmed = url.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_CALLBACK_URL;
  }

  return trimmed;
};

export const loginHref = (callbackPath: string): string => {
  const safe = sanitizeCallbackUrl(callbackPath);
  const params = new URLSearchParams({ callbackUrl: safe });
  return `/login?${params.toString()}`;
};

export const setupHref = (callbackPath: string): string => {
  const safe = sanitizeCallbackUrl(callbackPath);
  const params = new URLSearchParams({ callbackUrl: safe });
  return `/setup?${params.toString()}`;
};

export const changePasswordRequiredHref = (
  callbackPath?: string,
): string => {
  const path = "/change-password-required";
  if (!callbackPath) {
    return path;
  }

  const safe = sanitizeCallbackUrl(callbackPath);
  if (safe === path) {
    return path;
  }

  const params = new URLSearchParams({ callbackUrl: safe });
  return `${path}?${params.toString()}`;
};
