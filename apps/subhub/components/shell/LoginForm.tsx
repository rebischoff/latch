"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { RhfInput } from "@/components/form/RhfInput";
import { RhfPassword } from "@/components/form/RhfPassword";
import { loginPasswordFieldSchema } from "@/lib/auth-password";
import {
  sanitizeCallbackUrl,
} from "@/lib/auth-utils";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your login name or email"),
  password: loginPasswordFieldSchema(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: values.identifier,
        password: values.password,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: { message?: string };
      } | null;
      setSubmitError(
        payload?.error?.message ??
          payload?.message ??
          "Sign-in failed",
      );
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 400 }}>
      {submitError ? (
        <Alert
          type="error"
          title={submitError}
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <RhfInput
          control={control}
          name="identifier"
          label="Login name or email"
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
            autoComplete: "current-password",
            disabled: isSubmitting,
          }}
        />

        <Button type="primary" htmlType="submit" loading={isSubmitting} block>
          Sign in
        </Button>
      </div>
    </form>
  );
};
