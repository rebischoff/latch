"use client";

import { Typography } from "antd";
import type { ReactNode } from "react";

import { SURFACE_SECTION_MAX_WIDTH } from "@/components/form/formLayout";

type FormSectionProps = {
  title: string;
  children: ReactNode;
  /** default = SURFACE_SECTION_MAX_WIDTH; full = no max */
  width?: "default" | "full";
};

export const FormSection = ({ title, children, width = "default" }: FormSectionProps) => (
  <section
    style={{
      marginBottom: 24,
      width: "100%",
      maxWidth: width === "full" ? undefined : SURFACE_SECTION_MAX_WIDTH,
    }}
  >
    <Typography.Title level={5} style={{ marginTop: 0 }}>
      {title}
    </Typography.Title>
    {children}
  </section>
);
