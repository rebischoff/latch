"use client";

import { SaveOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  patchableFieldIds,
  type Manifest,
} from "@latch/contracts";
import { Can, CapabilitiesProvider, FieldControl } from "@latch/react";
import { App, Col, Row, Spin, Typography } from "antd";
import { notFound } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { RhfInput } from "@/components/form/RhfInput";
import { RhfSelect } from "@/components/form/RhfSelect";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { SurfaceApiError } from "@/lib/surface-api";

type UserDetailFormProps = {
  userId: string;
  manifest: Manifest;
};

const userRolesFormSchema = z.object({
  profile: z.object({
    login_name: z.string(),
    login_email: z.string(),
  }),
  role_assignments: z.array(z.string()),
});

type UserRolesFormValues = z.infer<typeof userRolesFormSchema>;

const formatUserLabel = (
  profile:
    | { login_name?: string | null; login_email?: string | null }
    | undefined,
  userId: string,
): string =>
  profile?.login_name ?? profile?.login_email ?? userId;

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
): UserRolesFormValues => {
  const profile = data?.profile as
    | { login_name?: string | null; login_email?: string | null }
    | undefined;

  return {
    profile: {
      login_name: profile?.login_name ?? "",
      login_email: profile?.login_email ?? "",
    },
    role_assignments: Array.isArray(data?.role_assignments)
      ? (data.role_assignments as string[])
      : [],
  };
};

export const UserDetailForm = ({ userId, manifest }: UserDetailFormProps) => {
  const { message } = App.useApp();
  const { data: detail, isLoading, error } = useSurfaceDetail("user_roles_detail", userId);
  const { data: roleList } = useSurfaceList("role_list");
  const patch = useSurfacePatch("user_roles_detail", userId);

  const activeManifest = detail?.manifest ?? manifest;

  const form = useForm<UserRolesFormValues>({
    resolver: zodResolver(userRolesFormSchema),
    defaultValues: buildDefaultValues(undefined),
  });

  useEffect(() => {
    if (detail?.data) {
      form.reset(buildDefaultValues(detail.data));
    }
  }, [detail?.data, form]);

  const roleOptions =
    roleList?.data.rows.map((row) => ({
      value: row.id,
      label: row.summary?.display_name ?? row.id,
    })) ?? [];

  const rolesWritable = fieldAllows(activeManifest, "role_assignments", "write");
  const canSave = patchableFieldIds(activeManifest).length > 0;
  const profile = detail?.data.profile as
    | { login_name?: string | null; login_email?: string | null }
    | undefined;

  const onSave = form.handleSubmit(async (values) => {
    const body: Record<string, unknown> = {};

    if (rolesWritable) {
      body.role_assignments = values.role_assignments;
    }

    try {
      await patch.mutateAsync(body);
      message.success("User saved");
    } catch {
      message.error("Unable to save user");
    }
  });

  const toolbarActions = useMemo(
    () => [
      {
        key: "save",
        label: "Save",
        icon: <SaveOutlined />,
        priority: "primary" as const,
        surfaceAction: "write" as const,
        disabled: !canSave,
        loading: patch.isPending,
        onClick: onSave,
      },
    ],
    [canSave, onSave, patch.isPending],
  );

  useRegisterSurfaceActions(activeManifest, toolbarActions);

  if (error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  return (
    <CapabilitiesProvider manifest={activeManifest}>
      {isLoading && !detail ? (
        <Spin />
      ) : (
        <form onSubmit={onSave}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {formatUserLabel(profile, userId)}
          </Typography.Title>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <FieldControl manifest={activeManifest} field="profile">
                <RhfInput
                  control={form.control}
                  name="profile.login_name"
                  label="Login name"
                  readOnly
                />
                <div style={{ marginTop: 16 }}>
                  <RhfInput
                    control={form.control}
                    name="profile.login_email"
                    label="Login email"
                    readOnly
                  />
                </div>
              </FieldControl>
            </Col>
            <Col xs={24} lg={12}>
              <FieldControl manifest={activeManifest} field="role_assignments">
                <Can field="role_assignments" action="read">
                  <RhfSelect
                    control={form.control}
                    name="role_assignments"
                    label="Roles"
                    mode="multiple"
                    readOnly={!rolesWritable}
                    options={roleOptions}
                  />
                </Can>
              </FieldControl>
            </Col>
          </Row>
        </form>
      )}
    </CapabilitiesProvider>
  );
};
