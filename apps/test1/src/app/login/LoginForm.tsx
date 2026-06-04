"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Input, Typography } from "antd";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { signInAction } from "@/app/actions/auth";
import { FormField } from "@/components/form/FormField";
import { DEV_LOGIN_EMAIL } from "@/lib/auth/dev-login";

type LoginFields = {
  email: string;
  password: string;
};

export const LoginForm = () => {
  const [serverError, setServerError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    setPending(true);
    const formData = new FormData();
    formData.set("email", values.email.trim());
    formData.set("password", values.password);
    try {
      const result = await signInAction(formData);
      if (result?.error) {
        setServerError(result.error);
      }
    } finally {
      setPending(false);
    }
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        padding: 24,
      }}
    >
      <Card style={{ width: 400, maxWidth: "100%" }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          test1 (Latch learn)
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Sign in with the dev user. Password is set via{" "}
          <code>TEST1_DEV_PASSWORD</code> (default <code>demo</code>).
        </Typography.Paragraph>
        {serverError ? (
          <Alert
            type="error"
            message={serverError}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <form onSubmit={onSubmit} noValidate>
          <FormField label="Email" required error={errors.email?.message}>
            <Controller
              name="email"
              control={control}
              rules={{ required: "Email is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<MailOutlined />}
                  placeholder={DEV_LOGIN_EMAIL}
                  autoComplete="email"
                  status={errors.email ? "error" : undefined}
                  disabled={pending}
                />
              )}
            />
          </FormField>
          <FormField label="Password" required error={errors.password?.message}>
            <Controller
              name="password"
              control={control}
              rules={{ required: "Password is required" }}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  prefix={<LockOutlined />}
                  placeholder="Password"
                  autoComplete="current-password"
                  status={errors.password ? "error" : undefined}
                  disabled={pending}
                />
              )}
            />
          </FormField>
          <Button type="primary" htmlType="submit" block loading={pending}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
};
