"use client";

import { useContext } from "react";

import { FormUiContext } from "./FormUiProvider";

export const useFormUi = () => {
  const context = useContext(FormUiContext);
  if (context === null) {
    throw new Error("useFormUi must be used within FormUiProvider");
  }
  return context;
};
