"use client";

import { createContext, type ReactNode } from "react";

export type FormUiState = {
  loading: boolean;
  disabled: boolean;
};

export const FormUiContext = createContext<FormUiState | null>(null);

type FormUiProviderProps = FormUiState & {
  children: ReactNode;
};

export const FormUiProvider = ({
  loading,
  disabled,
  children,
}: FormUiProviderProps) => (
  <FormUiContext.Provider value={{ loading, disabled }}>
    {children}
  </FormUiContext.Provider>
);
