"use client";

import { Input, type InputProps } from "antd";
import type { ChangeEvent, ComponentProps } from "react";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";

type RhfTextInputProps<T extends FieldValues> = {
  field: ControllerRenderProps<T, Path<T>>;
} & Omit<InputProps, "value" | "onChange" | "onBlur" | "name" | "ref">;

/** Ant Design Input wired to react-hook-form (pass `e.target.value`, not the event). */
export const RhfTextInput = <T extends FieldValues>({
  field,
  ...inputProps
}: RhfTextInputProps<T>) => (
  <Input
    {...inputProps}
    value={field.value ?? ""}
    onBlur={field.onBlur}
    onChange={(event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event.target.value);
    }}
  />
);

type RhfTextAreaProps<T extends FieldValues> = {
  field: ControllerRenderProps<T, Path<T>>;
  rows?: number;
} & Omit<ComponentProps<typeof Input.TextArea>, "value" | "onChange" | "onBlur" | "name" | "ref">;

/** Ant Design TextArea wired to react-hook-form. */
export const RhfTextArea = <T extends FieldValues>({
  field,
  rows = 3,
  ...inputProps
}: RhfTextAreaProps<T>) => (
  <Input.TextArea
    {...inputProps}
    rows={rows}
    value={field.value ?? ""}
    onBlur={field.onBlur}
    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
      field.onChange(event.target.value);
    }}
  />
);
