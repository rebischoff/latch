"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { RhfPassword } from "@/components/form/RhfPassword";
import { passwordFieldSchema } from "@/lib/auth-password";
import { sanitizeCallbackUrl } from "@/lib/auth-utils";

const changePasswordRequiredSchema = z
  .object({
    password: passwordFieldSchema("New password"),
    password_confirm: passwordFieldSchema("Confirm password"),
  })
  .refine((values) => values.password === values.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  });

type ChangePasswordRequiredFormValues = z.infer<
  typeof changePasswordRequiredSchema
>;

export const ChangePasswordRequiredForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ChangePasswordRequiredFormValues>({
    resolver: zodResolver(changePasswordRequiredSchema),
    defaultValues: {
      password: "",
      password_confirm: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const response = await fetch("/api/account/change-password-required", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: values.password,
        password_confirm: values.password_confirm,
      }),
    });

    if (!response.ok) {
      let message = "Password change failed";
      try {
        const body = (await response.json()) as {
          error?: { message?: string };
        };
        message = body.error?.message ?? message;
      } catch {
        // ignore JSON parse errors
      }
      setSubmitError(message);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 440 }}>
      {submitError ? (
        <Alert
          type="error"
          title={submitError}
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <RhfPassword
          control={control}
          name="password"
          label="New password"
          inputProps={{
            autoComplete: "new-password",
            disabled: isSubmitting,
          }}
        />

        <RhfPassword
          control={control}
          name="password_confirm"
          label="Confirm password"
          inputProps={{
            autoComplete: "new-password",
            disabled: isSubmitting,
          }}
        />

        <Button type="primary" htmlType="submit" loading={isSubmitting} block>
          Set password
        </Button>
      </div>
    </form>
  );
};
