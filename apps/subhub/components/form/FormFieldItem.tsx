"use client";

import { Form } from "antd";
import type { ReactNode } from "react";

import { formItemLayoutFullControl } from "./formLayout";

type FormFieldItemProps = {
  label: string;
  error?: string;
  help?: string;
  children: ReactNode;
  /** `full` — textarea, transfer, etc.; omit max width on wrapper column */
  controlWidth?: "default" | "full";
};

/** Presentational Form.Item shell — no `name` / `rules`; RHF Controller owns values. */
export const FormFieldItem = ({
  label,
  error,
  help,
  children,
  controlWidth = "default",
}: FormFieldItemProps) => (
  <Form.Item
    label={label}
    validateStatus={error ? "error" : undefined}
    help={error ?? help}
    {...(controlWidth === "full" ? formItemLayoutFullControl : {})}
  >
    {children}
  </Form.Item>
);
