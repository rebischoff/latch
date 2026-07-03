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

import { SurfaceToolbar, type ToolbarAction } from "./SurfaceToolbar";

export type SurfaceActionsRegistration = {
  manifest: Manifest;
  actions: ToolbarAction[];
};

type SurfaceActionsContextValue = {
  registration: SurfaceActionsRegistration | null;
  registrationRef: React.RefObject<SurfaceActionsRegistration | null>;
  register: (registration: SurfaceActionsRegistration) => void;
  unregister: (expected?: SurfaceActionsRegistration) => void;
};

const SurfaceActionsContext = createContext<SurfaceActionsContextValue | null>(
  null,
);

const actionsRenderEqual = (
  prev: ToolbarAction[] | undefined,
  next: ToolbarAction[],
): boolean => {
  if (!prev || prev.length !== next.length) {
    return false;
  }

  return prev.every((prevAction, index) => {
    const nextAction = next[index];
    const prevVariant = "variant" in prevAction ? prevAction.variant : "button";
    const nextVariant = "variant" in nextAction ? nextAction.variant : "button";
    return (
      prevVariant === nextVariant &&
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

const manifestRenderEqual = (
  prev: Manifest,
  next: Manifest,
): boolean =>
  prev.surface === next.surface &&
  JSON.stringify(prev.fields) === JSON.stringify(next.fields) &&
  JSON.stringify(prev.actions) === JSON.stringify(next.actions);

const registrationRenderEqual = (
  prev: SurfaceActionsRegistration | null,
  next: SurfaceActionsRegistration,
): boolean => {
  if (!prev) {
    return false;
  }

  return (
    manifestRenderEqual(prev.manifest, next.manifest) &&
    actionsRenderEqual(prev.actions, next.actions)
  );
};

export const SurfaceActionsProvider = ({ children }: { children: ReactNode }) => {
  const registrationRef = useRef<SurfaceActionsRegistration | null>(null);
  const [registration, setRegistration] =
    useState<SurfaceActionsRegistration | null>(null);

  const register = useCallback((next: SurfaceActionsRegistration) => {
    registrationRef.current = next;
    setRegistration((prev) => {
      const equal = registrationRenderEqual(prev, next);
      return equal ? prev : next;
    });
  }, []);

  const unregister = useCallback((expected?: SurfaceActionsRegistration) => {
    if (
      expected &&
      registrationRef.current &&
      !registrationRenderEqual(registrationRef.current, expected)
    ) {
      return;
    }

    registrationRef.current = null;
    setRegistration((prev) => (prev === null ? prev : null));
  }, []);

  const value = useMemo(
    () => ({ registration, registrationRef, register, unregister }),
    [registration, register, unregister],
  );

  return (
    <SurfaceActionsContext.Provider value={value}>
      {children}
    </SurfaceActionsContext.Provider>
  );
};

const useSurfaceActionsContext = (): SurfaceActionsContextValue => {
  const context = useContext(SurfaceActionsContext);
  if (!context) {
    throw new Error(
      "useRegisterSurfaceActions must be used within SurfaceActionsProvider",
    );
  }
  return context;
};

export const useRegisterSurfaceActions = (
  manifest: Manifest,
  actions: ToolbarAction[],
  enabled = true,
) => {
  const { register, unregister } = useSurfaceActionsContext();
  const ownedRef = useRef<SurfaceActionsRegistration | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      if (ownedRef.current) {
        unregister(ownedRef.current);
        ownedRef.current = null;
      }
      return;
    }

    const next = { manifest, actions };
    ownedRef.current = next;
    register(next);
  }, [enabled, actions, manifest, register, unregister]);

  useEffect(() => {
    return () => {
      if (ownedRef.current) {
        unregister(ownedRef.current);
        ownedRef.current = null;
      }
    };
  }, [unregister]);
};

export const HeaderSurfaceToolbar = () => {
  const context = useContext(SurfaceActionsContext);
  const live = context?.registrationRef.current;

  // Re-render when registration state changes (mount, unmount, disabled/loading).
  void context?.registration;

  if (!live) {
    return null;
  }

  return <SurfaceToolbar manifest={live.manifest} actions={live.actions} liveRegistrationRef={context?.registrationRef} />;
};
