"use client";

import { Form } from "antd";
import type { CSSProperties, ReactNode } from "react";

import { formItemLayout, SURFACE_CONTROL_MAX_WIDTH } from "@/components/form/formLayout";

import { useFormUi } from "./useFormUi";

type SurfaceFormLayoutProps = {
  children: ReactNode;
  maxWidth?: number;
  controlMaxWidth?: number;
  style?: CSSProperties;
};

/** antd Form for layout only — wrap inside HTML `<form onSubmit={handleSubmit(...)}>`. */
export const SurfaceFormLayout = ({
  children,
  maxWidth,
  controlMaxWidth = SURFACE_CONTROL_MAX_WIDTH,
  style,
}: SurfaceFormLayoutProps) => {
  const { disabled } = useFormUi();

  return (
    <Form
      component="div"
      layout="horizontal"
      colon={false}
      labelAlign="right"
      labelWrap
      labelCol={formItemLayout.labelCol}
      wrapperCol={{
        ...formItemLayout.wrapperCol,
        style: { maxWidth: controlMaxWidth },
      }}
      disabled={disabled}
      style={{ width: "100%", ...(maxWidth !== undefined ? { maxWidth } : {}), ...style }}
    >
      {children}
    </Form>
  );
};
