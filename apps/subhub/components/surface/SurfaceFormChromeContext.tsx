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

import type { ToolbarAction } from "@/components/shell/SurfaceToolbar";

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
  /** Surface-specific toolbar actions appended after Save/Delete (e.g. Win/Lose). */
  extraActions?: ToolbarAction[];
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

/** Compare extra actions by the visible/gating scalars (handlers change each render). */
const extraActionsRenderEqual = (
  prev: ToolbarAction[] | undefined,
  next: ToolbarAction[] | undefined,
): boolean => {
  if (prev === next) {
    return true;
  }
  if (!prev || !next || prev.length !== next.length) {
    return false;
  }

  return prev.every((prevAction, index) => {
    const nextAction = next[index]!;
    return (
      prevAction.key === nextAction.key &&
      prevAction.label === nextAction.label &&
      prevAction.priority === nextAction.priority &&
      prevAction.danger === nextAction.danger &&
      prevAction.disabled === nextAction.disabled &&
      prevAction.loading === nextAction.loading &&
      prevAction.surfaceAction === nextAction.surfaceAction &&
      prevAction.field === nextAction.field &&
      prevAction.fieldAction === nextAction.fieldAction
    );
  });
};

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
    Boolean(prev.onSaveAndNew) === Boolean(next.onSaveAndNew) &&
    extraActionsRenderEqual(prev.extraActions, next.extraActions)
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
