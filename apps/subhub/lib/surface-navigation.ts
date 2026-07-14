import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { PICKER_RETURN_PARAMS, redirectAfterCreate, redirectOnCancel } from "./picker-return-context";

/** Same-origin relative path only — rejects open redirects. */
export const sanitizeReturnTo = (
  returnTo: string | null | undefined,
  fallback: string,
): string => {
  if (!returnTo) {
    return fallback;
  }

  const trimmed = returnTo.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return fallback;
  }

  return trimmed;
};

export const currentReturnTo = (pathname: string, search: URLSearchParams): string => {
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export type BuildCreateUrlInput = {
  newPath: string;
  returnTo?: string;
  fallbackList: string;
  params?: Record<string, string>;
};

export const buildCreateUrl = ({
  newPath,
  returnTo,
  fallbackList,
  params,
}: BuildCreateUrlInput): string => {
  const searchParams = new URLSearchParams();
  searchParams.set(
    PICKER_RETURN_PARAMS.returnTo,
    sanitizeReturnTo(returnTo, fallbackList),
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, value);
    }
  }

  return `${newPath}?${searchParams.toString()}`;
};

export const navigateOnCancel = (
  router: AppRouterInstance,
  returnTo: string | null | undefined,
  fallbackList: string,
): void => {
  const safeReturnTo = sanitizeReturnTo(returnTo, fallbackList);
  const destination = returnTo ? redirectOnCancel(safeReturnTo) : fallbackList;
  router.push(destination);
};

export type NavigateAfterCreateInput = {
  returnTo: string | null | undefined;
  returnField?: string | null;
  newId: string;
  fallbackList: string;
  fallbackDetail: (id: string) => string;
};

export const resolveAfterCreateNavigation = ({
  returnTo,
  returnField,
  newId,
  fallbackList,
  fallbackDetail,
}: NavigateAfterCreateInput): string => {
  if (returnTo && returnField) {
    return redirectAfterCreate(sanitizeReturnTo(returnTo, fallbackList), newId);
  }

  return fallbackDetail(newId);
};

export const navigateAfterCreate = (
  router: AppRouterInstance,
  input: NavigateAfterCreateInput,
): void => {
  router.replace(resolveAfterCreateNavigation(input));
  router.refresh();
};

export type BuildDetailHrefInput = {
  detailPath: string;
  currentSearch?: string | URLSearchParams | null;
  /** Query keys to copy when set. Default: `["tab"]`. */
  preserve?: readonly string[];
};

const toSearchParams = (
  currentSearch: string | URLSearchParams | null | undefined,
): URLSearchParams => {
  if (currentSearch instanceof URLSearchParams) {
    return currentSearch;
  }
  if (!currentSearch) {
    return new URLSearchParams();
  }
  const trimmed = currentSearch.startsWith("?")
    ? currentSearch.slice(1)
    : currentSearch;
  return new URLSearchParams(trimmed);
};

/**
 * Same-surface detail link that preserves listed query keys (default: `tab`).
 * Does not copy unrelated params (e.g. `returnTo`) unless listed in `preserve`.
 */
export const buildDetailHref = ({
  detailPath,
  currentSearch,
  preserve = ["tab"],
}: BuildDetailHrefInput): string => {
  const source = toSearchParams(currentSearch);
  const next = new URLSearchParams();

  for (const key of preserve) {
    const value = source.get(key);
    if (value != null && value !== "") {
      next.set(key, value);
    }
  }

  const query = next.toString();
  return query ? `${detailPath}?${query}` : detailPath;
};

/**
 * Returns `requested` when it is in `availableKeys`; otherwise `defaultKey`
 * (or the first available key when the default is also unavailable).
 */
export const resolveActiveTab = (
  requested: string | null | undefined,
  availableKeys: readonly string[],
  defaultKey: string,
): string => {
  if (requested && availableKeys.includes(requested)) {
    return requested;
  }
  if (availableKeys.includes(defaultKey)) {
    return defaultKey;
  }
  return availableKeys[0] ?? defaultKey;
};
