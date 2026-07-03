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
