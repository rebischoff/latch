"use client";

import type { Manifest } from "@latch/contracts";
import { CapabilitiesProvider } from "@latch/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  FormProvider,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { FormUiProvider } from "./FormUiProvider";
import { SurfaceFormOverlay } from "./SurfaceFormOverlay";
import { useDelayedOverlay } from "./useDelayedOverlay";

type SurfaceFormRootProps<T extends FieldValues> = {
  manifest: Manifest;
  /** Initial load — skeleton placeholders in field controls. */
  loading: boolean;
  /** Record transition or slow save — delayed overlay spinner over the form pane. */
  blocking?: boolean;
  disabled: boolean;
  form: UseFormReturn<T>;
  defaultValues: DefaultValues<T>;
  resetKey?: unknown;
  children: ReactNode;
};

export const SurfaceFormRoot = <T extends FieldValues>({
  manifest,
  loading,
  blocking = false,
  disabled,
  form,
  defaultValues,
  resetKey,
  children,
}: SurfaceFormRootProps<T>) => {
  const showOverlay = useDelayedOverlay(blocking);
  const paneRef = useRef<HTMLDivElement>(null);
  const lastResetKeyRef = useRef(resetKey);

  useLayoutEffect(() => {
    const resetKeyChanged = lastResetKeyRef.current !== resetKey;
    lastResetKeyRef.current = resetKey;

    if (!resetKeyChanged && form.formState.isDirty) {
      return;
    }

    form.reset(defaultValues);
  }, [defaultValues, form, resetKey]);

  return (
    <CapabilitiesProvider manifest={manifest}>
      <FormUiProvider loading={loading} disabled={disabled}>
        <FormProvider {...form}>
          <div ref={paneRef}>
            {children}
            {showOverlay ? <SurfaceFormOverlay anchorRef={paneRef} /> : null}
          </div>
        </FormProvider>
      </FormUiProvider>
    </CapabilitiesProvider>
  );
};
