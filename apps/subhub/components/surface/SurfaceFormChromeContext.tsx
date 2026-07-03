"use client";

import type { Manifest } from "@latch/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type SurfaceFormChromeMode = "create" | "edit";

export type SurfaceFormChromeRegistration = {
  mode: SurfaceFormChromeMode;
  manifest: Manifest;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  canDelete?: boolean;
  isDirty?: boolean;
  onRevert?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onSaveAndNew?: () => void;
};

type SurfaceFormChromeContextValue = {
  registration: SurfaceFormChromeRegistration | null;
  registrationRef: React.RefObject<SurfaceFormChromeRegistration | null>;
  register: (registration: SurfaceFormChromeRegistration) => void;
  clear: (expected?: SurfaceFormChromeRegistration) => void;
};

const SurfaceFormChromeContext = createContext<SurfaceFormChromeContextValue | null>(
  null,
);

/** Scalar fields only — handler refs change every render (e.g. form.handleSubmit). */
const registrationRenderEqual = (
  prev: SurfaceFormChromeRegistration | null,
  next: SurfaceFormChromeRegistration,
): boolean => {
  if (!prev) {
    return false;
  }

  return (
    prev.mode === next.mode &&
    prev.manifest === next.manifest &&
    prev.canSave === next.canSave &&
    prev.saving === next.saving &&
    prev.canDelete === next.canDelete &&
    prev.isDirty === next.isDirty &&
    Boolean(prev.onRevert) === Boolean(next.onRevert) &&
    Boolean(prev.onDelete) === Boolean(next.onDelete) &&
    Boolean(prev.onCancel) === Boolean(next.onCancel) &&
    Boolean(prev.onSaveAndNew) === Boolean(next.onSaveAndNew)
  );
};

export const SurfaceFormChromeProvider = ({ children }: { children: ReactNode }) => {
  const registrationRef = useRef<SurfaceFormChromeRegistration | null>(null);
  const [registration, setRegistration] =
    useState<SurfaceFormChromeRegistration | null>(null);

  const register = useCallback((next: SurfaceFormChromeRegistration) => {
    registrationRef.current = next;
    setRegistration((prev) => {
      const equal = registrationRenderEqual(prev, next);
      return equal ? prev : next;
    });
  }, []);

  const clear = useCallback((expected?: SurfaceFormChromeRegistration) => {
    if (expected && registrationRef.current !== expected) {
      return;
    }

    registrationRef.current = null;
    setRegistration((prev) => (prev === null ? prev : null));
  }, []);

  const value = useMemo(
    () => ({ registration, registrationRef, register, clear }),
    [registration, register, clear],
  );

  return (
    <SurfaceFormChromeContext.Provider value={value}>
      {children}
    </SurfaceFormChromeContext.Provider>
  );
};

const useSurfaceFormChromeContext = (): SurfaceFormChromeContextValue => {
  const context = useContext(SurfaceFormChromeContext);
  if (!context) {
    throw new Error(
      "useSurfaceFormChrome must be used within SurfaceFormChromeProvider",
    );
  }
  return context;
};

export const useSurfaceFormChromeRegistration = (): SurfaceFormChromeRegistration | null => {
  const context = useContext(SurfaceFormChromeContext);
  void context?.registration;
  return context?.registrationRef.current ?? null;
};

export const useSurfaceFormChrome = (
  registration: SurfaceFormChromeRegistration,
): void => {
  const { register, clear } = useSurfaceFormChromeContext();
  const ownedRef = useRef<SurfaceFormChromeRegistration | null>(null);

  useLayoutEffect(() => {
    const next = registration;
    ownedRef.current = next;
    register(next);
  }, [register, registration]);

  useEffect(() => {
    return () => {
      if (ownedRef.current) {
        clear(ownedRef.current);
        ownedRef.current = null;
      }
    };
  }, [clear]);
};
