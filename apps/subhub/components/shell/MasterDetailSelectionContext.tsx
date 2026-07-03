"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type MasterDetailSelectionContextValue = {
  selectedId: string | null;
  selectionRef: RefObject<string | null>;
  setSelectedId: (id: string | null) => void;
};

const MasterDetailSelectionContext =
  createContext<MasterDetailSelectionContextValue | null>(null);

export const MasterDetailSelectionProvider = ({ children }: { children: ReactNode }) => {
  const selectionRef = useRef<string | null>(null);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);

  const setSelectedId = useCallback((id: string | null) => {
    selectionRef.current = id;
    setSelectedIdState(id);
  }, []);

  const value = useMemo(
    () => ({ selectedId, selectionRef, setSelectedId }),
    [selectedId, setSelectedId],
  );

  return (
    <MasterDetailSelectionContext.Provider value={value}>
      {children}
    </MasterDetailSelectionContext.Provider>
  );
};

export const useMasterDetailSelection = (): MasterDetailSelectionContextValue => {
  const context = useContext(MasterDetailSelectionContext);
  if (!context) {
    throw new Error(
      "useMasterDetailSelection must be used within MasterDetailSelectionProvider",
    );
  }
  return context;
};

/** Optional read for toolbar composer — flat surfaces omit the provider slice usage. */
export const useMasterDetailSelectionOptional = (): MasterDetailSelectionContextValue | null =>
  useContext(MasterDetailSelectionContext);
