"use client";

import { SaveOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { surfaceAllows, type Manifest } from "@latch/contracts";
import { CapabilitiesProvider } from "@latch/react";
import { App, Col, Row, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { RhfInput } from "@/components/form/RhfInput";
import { RhfPassword } from "@/components/form/RhfPassword";
import { RhfSelect } from "@/components/form/RhfSelect";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { passwordFieldSchema } from "@/lib/auth-password";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";

type UserCreateFormProps = {
  linkPartyId: string;
  returnTo: string;
  personDisplayName: string;
  manifest: Manifest;
};

const userCreateFormSchema = z
  .object({
    login_name: z.string().min(1, "Login name is required"),
    password: z.string().optional(),
    password_confirm: z.string().optional(),
    role_assignments: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    const password = values.password?.trim() ?? "";
    const confirm = values.password_confirm?.trim() ?? "";

    if (password && confirm && password !== confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["password_confirm"],
      });
    }

    if (password) {
      const result = passwordFieldSchema("Password").safeParse(password);
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error.issues[0]?.message ?? "Invalid password",
          path: ["password"],
        });
      }
    }
  });

type UserCreateFormValues = z.infer<typeof userCreateFormSchema>;

export const UserCreateForm = ({
  linkPartyId,
  returnTo,
  personDisplayName,
  manifest,
}: UserCreateFormProps) => {
  const router = useRouter();
  const { message } = App.useApp();
  const create = useSurfaceListCreate("user_list");
  const { data: roleList } = useSurfaceList("role_list");

  const form = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateFormSchema),
    defaultValues: {
      login_name: "",
      password: "",
      password_confirm: "",
      role_assignments: [],
    },
  });

  const roleOptions =
    roleList?.data.rows.map((row) => ({
      value: row.id,
      label: row.summary?.display_name ?? row.id,
    })) ?? [];

  const canSave = surfaceAllows(manifest, "create");

  const onCancel = useCallback(() => {
    router.push(returnTo);
  }, [router, returnTo]);

  const onSave = form.handleSubmit(async (values) => {
    const body: Record<string, unknown> = {
      linkPartyId,
      login_name: values.login_name.trim(),
      role_assignments: values.role_assignments,
    };

    const password = values.password?.trim();
    if (password) {
      body.password = password;
    }

    try {
      await create.mutateAsync(body);
      message.success("User created");
      router.replace(returnTo);
      router.refresh();
    } catch {
      message.error("Unable to create user");
    }
  });

  const toolbarActions = useMemo(
    () => [
      {
        key: "save",
        label: "Save",
        icon: <SaveOutlined />,
        priority: "primary" as const,
        surfaceAction: "create" as const,
        disabled: !canSave,
        loading: create.isPending,
        onClick: onSave,
      },
      {
        key: "cancel",
        label: "Cancel",
        priority: "secondary" as const,
        onClick: onCancel,
      },
    ],
    [canSave, create.isPending, onCancel, onSave],
  );

  useRegisterSurfaceActions(manifest, toolbarActions);

  return (
    <CapabilitiesProvider manifest={manifest}>
      <form onSubmit={onSave}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          New app user
        </Typography.Title>

        <Typography.Paragraph type="secondary">
          Provisioning login for <strong>{personDisplayName}</strong>
        </Typography.Paragraph>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <RhfInput control={form.control} name="login_name" label="Login name" />
            <div style={{ marginTop: 16 }}>
              <RhfPassword control={form.control} name="password" label="Password" />
              <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
                Optional — leave blank if the user will sign in after an admin reset
              </Typography.Text>
            </div>
            <div style={{ marginTop: 16 }}>
              <RhfPassword
                control={form.control}
                name="password_confirm"
                label="Confirm password"
              />
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <RhfSelect
              control={form.control}
              name="role_assignments"
              label="Roles"
              mode="multiple"
              options={roleOptions}
            />
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
              Optional — assign zero or more roles
            </Typography.Text>
          </Col>
        </Row>
      </form>
    </CapabilitiesProvider>
  );
};
