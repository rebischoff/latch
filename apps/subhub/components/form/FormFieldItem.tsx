"use client";

import { Form } from "antd";
import type { CSSProperties, ReactNode } from "react";

import { formItemLayoutFullControl } from "./formLayout";

type FormFieldItemProps = {
  label: ReactNode;
  error?: string;
  help?: string;
  children: ReactNode;
  /**
   * Renders in the control column before the control (e.g. inherit checkbox).
   * Keeps `labelCol` alignment; shortens the control to fit.
   */
  controlPrefix?: ReactNode;
  /** `full` — textarea, transfer, etc.; omit max width on wrapper column */
  controlWidth?: "default" | "full";
};

const controlRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
};

const controlPrefixStyle: CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
};

const controlBodyStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

/** Presentational Form.Item shell — no `name` / `rules`; RHF Controller owns values. */
export const FormFieldItem = ({
  label,
  error,
  help,
  children,
  controlPrefix,
  controlWidth = "default",
}: FormFieldItemProps) => (
  <Form.Item
    label={label}
    validateStatus={error ? "error" : undefined}
    help={error ?? help}
    {...(controlWidth === "full" ? formItemLayoutFullControl : {})}
  >
    {controlPrefix ? (
      <div style={controlRowStyle}>
        <div style={controlPrefixStyle}>{controlPrefix}</div>
        <div style={controlBodyStyle}>{children}</div>
      </div>
    ) : (
      children
    )}
  </Form.Item>
);
