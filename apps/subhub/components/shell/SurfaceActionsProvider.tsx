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
  unregister: () => void;
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

  const unregister = useCallback(() => {
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
) => {
  const { register, unregister } = useSurfaceActionsContext();

  useLayoutEffect(() => {
    register({ manifest, actions });
  }, [actions, manifest, register]);

  useEffect(() => unregister, [unregister]);
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
