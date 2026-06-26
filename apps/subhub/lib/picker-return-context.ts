import { routes } from "./nav-routes";

export const PICKER_RETURN_PARAMS = {
  create: "create",
  returnTo: "returnTo",
  returnField: "returnField",
  selectedId: "selectedId",
} as const;

export type PickerTarget = "manufacturer";

export type PickerReturnContext = {
  isCreate: boolean;
  returnTo: string | null;
  returnField: string | null;
  selectedId: string | null;
};

export type BuildPickerCreateUrlInput = {
  target: PickerTarget;
  returnTo: string;
  returnField?: string;
};

type SearchParamsLike = {
  get(name: string): string | null;
};

const PICKER_TARGET_ROUTES: Record<PickerTarget, string> = {
  manufacturer: routes.manufacturers.new,
};

export const appendQueryParam = (url: string, key: string, value: string): string => {
  const questionIndex = url.indexOf("?");
  const pathname = questionIndex === -1 ? url : url.slice(0, questionIndex);
  const query = questionIndex === -1 ? "" : url.slice(questionIndex + 1);
  const params = new URLSearchParams(query);
  params.set(key, value);
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
};

export const stripQueryParam = (url: string, key: string): string => {
  const questionIndex = url.indexOf("?");
  const pathname = questionIndex === -1 ? url : url.slice(0, questionIndex);
  const query = questionIndex === -1 ? "" : url.slice(questionIndex + 1);
  if (!query) {
    return pathname;
  }

  const params = new URLSearchParams(query);
  params.delete(key);
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
};

export const buildPickerCreateUrl = ({
  target,
  returnTo,
  returnField,
}: BuildPickerCreateUrlInput): string => {
  const params = new URLSearchParams();
  params.set(PICKER_RETURN_PARAMS.returnTo, returnTo);
  if (returnField) {
    params.set(PICKER_RETURN_PARAMS.returnField, returnField);
  }

  return `${PICKER_TARGET_ROUTES[target]}?${params.toString()}`;
};

export const parseReturnContext = (searchParams: SearchParamsLike): PickerReturnContext => ({
  isCreate: searchParams.get(PICKER_RETURN_PARAMS.create) === "1",
  returnTo: searchParams.get(PICKER_RETURN_PARAMS.returnTo),
  returnField: searchParams.get(PICKER_RETURN_PARAMS.returnField),
  selectedId: searchParams.get(PICKER_RETURN_PARAMS.selectedId),
});

export const redirectAfterCreate = (returnTo: string, selectedId: string): string =>
  appendQueryParam(returnTo, PICKER_RETURN_PARAMS.selectedId, selectedId);

export const redirectOnCancel = (returnTo: string): string =>
  stripQueryParam(returnTo, PICKER_RETURN_PARAMS.selectedId);
