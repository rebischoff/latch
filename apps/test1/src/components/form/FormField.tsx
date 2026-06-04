"use client";

import { Typography } from "antd";
import type { ReactNode } from "react";

export type FormFieldProps = {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

/** RHF field shell — Ant Design inputs only; never antd `Form`. */
export const FormField = ({
  label,
  error,
  required,
  children,
}: FormFieldProps) => (
  <div style={{ marginBottom: 24 }}>
    <label style={{ display: "block" }}>
      <Typography.Text>
        {label}
        {required ? (
          <Typography.Text type="danger"> *</Typography.Text>
        ) : null}
      </Typography.Text>
      <div style={{ marginTop: 8 }}>{children}</div>
    </label>
    {error ? (
      <Typography.Text
        type="danger"
        style={{ display: "block", marginTop: 4 }}
        role="alert"
      >
        {error}
      </Typography.Text>
    ) : null}
  </div>
);
