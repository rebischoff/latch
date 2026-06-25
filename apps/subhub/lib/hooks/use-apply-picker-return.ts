"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { FieldValues, Path, PathValue, UseFormSetValue } from "react-hook-form";

import {
  parseReturnContext,
  PICKER_RETURN_PARAMS,
} from "@/lib/picker-return-context";

import { manufacturerPickerKey } from "./surface-query-keys";

type UseApplyPickerReturnOptions<T extends FieldValues> = {
  setValue: UseFormSetValue<T>;
  returnField: Path<T>;
  pickerQueryKey?: readonly unknown[];
};

/**
 * Applies cross-Surface picker return (`selectedId` query param) on the origin form.
 *
 * **Not sufficient alone** on `SurfaceFormRoot` forms: merge `selectedId` into
 * `defaultValues` first (ref-persist across URL strip). See
 * `docs/decisions/general.md` — "picker return on SurfaceFormRoot forms".
 */
export const useApplyPickerReturn = <T extends FieldValues>({
  setValue,
  returnField,
  pickerQueryKey = manufacturerPickerKey,
}: UseApplyPickerReturnOptions<T>) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) {
      return;
    }

    const { selectedId } = parseReturnContext(searchParams);
    if (!selectedId) {
      return;
    }

    setValue(returnField, selectedId as PathValue<T, Path<T>>, {
      shouldDirty: true,
      shouldValidate: true,
    });
    void queryClient.invalidateQueries({ queryKey: pickerQueryKey });

    appliedRef.current = true;

    const params = new URLSearchParams(searchParams.toString());
    params.delete(PICKER_RETURN_PARAMS.selectedId);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [searchParams, setValue, returnField, pickerQueryKey, queryClient, router, pathname]);
};
