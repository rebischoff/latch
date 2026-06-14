"use client";

import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { CapabilitiesProvider, FieldControl } from "@latch/react";
import { App, Col, Modal, Row, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { GrantMatrix } from "@/components/iam/GrantMatrix";
import { RhfInput } from "@/components/form/RhfInput";
import { ReadOnlyValue } from "@/components/form/RhfInput";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import {
  RoleDetailPatchSchema,
  type RoleGrantTuple,
  type SurfaceBindingTuple,
} from "@/lib/iam/descriptors";
import { subhubRegistry } from "@/lib/policy-registry";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import { routes } from "@/lib/nav-routes";
import { SurfaceApiError } from "@/lib/surface-api";

type RoleDetailFormProps = {
  roleId: string;
  manifest: Manifest;
};

type RoleDetailFormValues = {
  catalog: {
    display_name: string;
  };
};

const isSystemRole = (roleClass: string | undefined): boolean =>
  roleClass === "system_data" || roleClass === "system_iam";

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
): RoleDetailFormValues => ({
  catalog: {
    display_name:
      (data?.catalog as { display_name?: string } | undefined)?.display_name ?? "",
  },
});

export const RoleDetailForm = ({ roleId, manifest }: RoleDetailFormProps) => {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { data: detail, isLoading, error } = useSurfaceDetail("role_detail", roleId);
  const patch = useSurfacePatch("role_detail", roleId);
  const remove = useSurfaceDelete("role_detail", roleId);

  const activeManifest = detail?.manifest ?? manifest;
  const catalog = detail?.data.catalog as
    | { id?: string; role_class?: string; display_name?: string }
    | undefined;
  const systemRole = isSystemRole(catalog?.role_class);

  const [grants, setGrants] = useState<RoleGrantTuple[]>([]);
  const [surfaceBindings, setSurfaceBindings] = useState<SurfaceBindingTuple[]>([]);

  const resolver = zodResolver(
    narrowPatchSchema(RoleDetailPatchSchema, activeManifest),
  );

  const form = useForm<RoleDetailFormValues>({
    resolver: resolver as Resolver<RoleDetailFormValues>,
    defaultValues: buildDefaultValues(undefined),
  });

  useEffect(() => {
    if (detail?.data) {
      form.reset(buildDefaultValues(detail.data));
      setGrants(
        Array.isArray(detail.data.grants)
          ? (detail.data.grants as RoleGrantTuple[])
          : [],
      );
      setSurfaceBindings(
        Array.isArray(detail.data.surface_bindings)
          ? (detail.data.surface_bindings as SurfaceBindingTuple[])
          : [],
      );
    }
  }, [detail?.data, form]);

  const catalogWritable =
    fieldAllows(activeManifest, "catalog", "write") && !systemRole;
  const grantsWritable =
    fieldAllows(activeManifest, "grants", "write") && !systemRole;
  const bindingsWritable =
    fieldAllows(activeManifest, "surface_bindings", "write") && !systemRole;
  const canSave = patchableFieldIds(activeManifest).length > 0 && !systemRole;
  const canDelete = surfaceAllows(activeManifest, "delete") && !systemRole;

  const onSave = form.handleSubmit(async (values) => {
    const body: Record<string, unknown> = {};

    if (catalogWritable) {
      body.catalog = { display_name: values.catalog.display_name };
    }

    if (bindingsWritable) {
      body.surface_bindings = surfaceBindings;
    }

    if (grantsWritable) {
      body.grants = grants;
    }

    try {
      await patch.mutateAsync(body);
      message.success("Role saved");
    } catch {
      message.error("Unable to save role");
    }
  });

  const onDelete = () => {
    modal.confirm({
      title: "Delete role?",
      content: "This permanently removes the role and its grants.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await remove.mutateAsync();
          message.success("Role deleted");
          router.push(routes.roles.list);
          router.refresh();
        } catch {
          message.error("Unable to delete role");
        }
      },
    });
  };

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
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        priority: "secondary" as const,
        surfaceAction: "delete" as const,
        danger: true,
        disabled: !canDelete,
        loading: remove.isPending,
        onClick: onDelete,
      },
    ],
    [canDelete, canSave, onDelete, onSave, patch.isPending, remove.isPending],
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
            {catalog?.display_name ?? "Role"}
          </Typography.Title>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <FieldControl manifest={activeManifest} field="catalog">
                {catalogWritable ? (
                  <RhfInput
                    control={form.control}
                    name="catalog.display_name"
                    label="Display name"
                  />
                ) : (
                  <ReadOnlyValue label="Display name" value={catalog?.display_name} />
                )}
              </FieldControl>
            </Col>
            <Col xs={24} lg={12}>
              <FieldControl manifest={activeManifest} field="catalog">
                <ReadOnlyValue label="Role class" value={catalog?.role_class} />
              </FieldControl>
            </Col>
          </Row>

          <FieldControl manifest={activeManifest} field="grants">
            <Typography.Title level={5}>Grants</Typography.Title>
            <GrantMatrix
              registry={subhubRegistry}
              grants={grants}
              surfaceBindings={surfaceBindings}
              readOnly={!grantsWritable && !bindingsWritable}
              onGrantsChange={setGrants}
              onBindingsChange={setSurfaceBindings}
            />
          </FieldControl>
        </form>
      )}
    </CapabilitiesProvider>
  );
};
