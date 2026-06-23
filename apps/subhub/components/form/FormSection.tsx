"use client";

import { Typography } from "antd";
import type { ReactNode } from "react";

type FormSectionProps = {
  title: string;
  children: ReactNode;
};

export const FormSection = ({ title, children }: FormSectionProps) => (
  <section style={{ marginBottom: 24 }}>
    <Typography.Title level={5} style={{ marginTop: 0 }}>
      {title}
    </Typography.Title>
    {children}
  </section>
);
