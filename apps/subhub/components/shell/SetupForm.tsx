"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { RhfInput } from "@/components/form/RhfInput";
import { RhfPassword } from "@/components/form/RhfPassword";
import { passwordFieldSchema } from "@/lib/auth-password";
import { sanitizeCallbackUrl } from "@/lib/auth-utils";

const loginNameSchema = z
  .string()
  .min(2, "Login name must be at least 2 characters")
  .max(64, "Login name must be at most 64 characters")
  .refine(
    (value) =>
      /^[a-zA-Z0-9._-]+$/.test(value) ||
      z.string().email().safeParse(value).success,
    "Use letters, numbers, dots, underscores, hyphens, or a valid email",
  );

const setupSchema = z
  .object({
    token: z.string().min(1, "Setup token is required"),
    login_name: loginNameSchema,
    password: passwordFieldSchema(),
    password_confirm: passwordFieldSchema("Confirm password"),
  })
  .refine((values) => values.password === values.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  });

type SetupFormValues = z.infer<typeof setupSchema>;

export const SetupForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      token: "",
      login_name: "",
      password: "",
      password_confirm: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: values.token,
        login_name: values.login_name,
        password: values.password,
        password_confirm: values.password_confirm,
      }),
    });

    if (!response.ok) {
      let message = "Setup failed";
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

    const params = new URLSearchParams({ callbackUrl });
    router.push(`/login?${params.toString()}`);
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
          name="token"
          label="Setup token"
          inputProps={{
            autoComplete: "off",
            disabled: isSubmitting,
          }}
        />

        <RhfInput
          control={control}
          name="login_name"
          label="Login name"
          inputProps={{
            autoComplete: "username",
            disabled: isSubmitting,
          }}
        />

        <RhfPassword
          control={control}
          name="password"
          label="Password"
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
          Create master account
        </Button>
      </div>
    </form>
  );
};
