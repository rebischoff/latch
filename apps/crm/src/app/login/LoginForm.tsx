"use client";

import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Input, Typography } from "antd";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/form/FormField";

import { loginAction, type LoginState } from "./actions";

type LoginFields = {
  username: string;
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
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    setPending(true);
    const formData = new FormData();
    formData.set("username", values.username.trim());
    formData.set("password", values.password);
    try {
      const result = await loginAction(formData);
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
          Latch CRM (demo)
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Sign in with a seed user. Dev password is set via{" "}
          <code>CRM_DEV_PASSWORD</code>.
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
          <FormField
            label="Username"
            required
            error={errors.username?.message}
          >
            <Controller
              name="username"
              control={control}
              rules={{ required: "Username is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<UserOutlined />}
                  placeholder="tech@demo.local"
                  autoComplete="username"
                  status={errors.username ? "error" : undefined}
                  disabled={pending}
                />
              )}
            />
          </FormField>
          <FormField
            label="Password"
            required
            error={errors.password?.message}
          >
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
