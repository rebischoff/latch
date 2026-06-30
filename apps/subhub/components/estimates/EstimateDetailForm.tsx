"use client";

import { DeleteOutlined, SaveOutlined, UndoOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { App, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { DatePickerInput } from "@/components/form/DatePickerInput";
import {
  EstimateLineTreeTable,
  type EstimateLineFormRow,
  type EstimateSystemFormRow,
} from "@/components/estimates/EstimateLineTreeTable";
import {
  orderLineItemsForPatch,
  type EstimateSystemSpecFormRow,
} from "@/components/estimates/estimate-line-tree";
import {
  EstimateStakeholderFields,
  validateEstimateStakeholderDuplicates,
  type EstimateStakeholderFormRow,
} from "@/components/estimates/EstimateStakeholderFields";
import { FormSection } from "@/components/form/FormSection";
import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import { SelectInput } from "@/components/form/SelectInput";
import { TextInput } from "@/components/form/TextInput";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useEstimateSitePicker } from "@/lib/hooks/use-estimate-site-picker";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import {
  EstimateDetailCreateSchema,
  EstimateDetailPatchSchema,
} from "@/lib/estimates/descriptors/estimate-detail";
import { routes } from "@/lib/nav-routes";
import { SurfaceApiError } from "@/lib/surface-api";

const STATUS_COLORS: Record<string, string> = {
  draft: "default",
  sent: "processing",
  won: "success",
  lost: "error",
  expired: "warning",
};

const statusLabel = (status: string): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

type EstimateDetailFormProps = {
  estimateId: string;
  manifest: Manifest;
  canNavigateSite: boolean;
};

type EstimateDetailFormValues = {
  profile: {
    title: string;
    site_id: string;
    estimate_date: string | null;
    valid_until: string | null;
  };
  stakeholders: EstimateStakeholderFormRow[];
  systems: EstimateSystemFormRow[];
  line_items: EstimateLineFormRow[];
};

const mapStakeholders = (rows: unknown): EstimateStakeholderFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      party_id: typeof item.party_id === "string" ? item.party_id : "",
      relation_id: typeof item.relation_id === "string" ? item.relation_id : "",
      display_name: typeof item.display_name === "string" ? item.display_name : "",
      relation_label:
        typeof item.relation_label === "string" ? item.relation_label : "",
      kind: typeof item.kind === "string" ? item.kind : undefined,
      sort_order: typeof item.sort_order === "number" ? item.sort_order : index + 1,
    };
  });
};

const mapSystems = (rows: unknown): EstimateSystemFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const item = row as Record<string, unknown>;
    const specs: EstimateSystemSpecFormRow[] = Array.isArray(item.specs)
      ? item.specs.map((specRow) => {
          const spec = specRow as Record<string, unknown>;
          const valueType =
            spec.value_type === "enum" ||
            spec.value_type === "boolean" ||
            spec.value_type === "text"
              ? spec.value_type
              : undefined;

          return {
            system_spec_def_id:
              typeof spec.system_spec_def_id === "string" ? spec.system_spec_def_id : "",
            def_display_name:
              typeof spec.def_display_name === "string" ? spec.def_display_name : undefined,
            value_type: valueType,
            system_spec_option_id:
              typeof spec.system_spec_option_id === "string"
                ? spec.system_spec_option_id
                : null,
            option_display_name:
              typeof spec.option_display_name === "string"
                ? spec.option_display_name
                : undefined,
            value_text: typeof spec.value_text === "string" ? spec.value_text : null,
            value_boolean:
              typeof spec.value_boolean === "boolean" ? spec.value_boolean : null,
            options: Array.isArray(spec.options)
              ? spec.options
                  .map((optionRow) => {
                    const option = optionRow as Record<string, unknown>;
                    if (
                      typeof option.id !== "string" ||
                      typeof option.display_name !== "string"
                    ) {
                      return null;
                    }

                    return {
                      id: option.id,
                      display_name: option.display_name,
                    };
                  })
                  .filter((option): option is { id: string; display_name: string } =>
                    Boolean(option),
                  )
              : undefined,
          };
        })
      : [];

    return {
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      system_id: typeof item.system_id === "string" ? item.system_id : "",
      system_name: typeof item.system_name === "string" ? item.system_name : "",
      sort_order: typeof item.sort_order === "number" ? item.sort_order : index + 1,
      specs,
    };
  });
};

const mapLineItems = (rows: unknown): EstimateLineFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    const asString = (value: unknown): string | null =>
      typeof value === "string" ? value : null;

    const materialStatus =
      item.material_status === "generic" ||
      item.material_status === "suggested" ||
      item.material_status === "verified"
        ? item.material_status
        : null;

    return {
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      line_role: (item.line_role as EstimateLineFormRow["line_role"]) ?? "standalone",
      line_kind: (item.line_kind as EstimateLineFormRow["line_kind"]) ?? "product",
      description: typeof item.description === "string" ? item.description : "",
      quantity: typeof item.quantity === "number" ? item.quantity : 0,
      unit: typeof item.unit === "string" ? item.unit : "ea",
      unit_cost: typeof item.unit_cost === "number" ? item.unit_cost : 0,
      unit_price: typeof item.unit_price === "number" ? item.unit_price : 0,
      parent_line_id: asString(item.parent_line_id),
      estimate_system_id: asString(item.estimate_system_id),
      material_status: materialStatus,
      phase_id: asString(item.phase_id),
      item_id: asString(item.item_id),
      part_id: asString(item.part_id),
      vendor_part_id: asString(item.vendor_part_id),
    };
  });
};

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
): EstimateDetailFormValues => {
  const profile = data?.profile as
    | {
        title?: string | null;
        site_id?: string | null;
        estimate_date?: string | null;
        valid_until?: string | null;
      }
    | undefined;

  return {
    profile: {
      title: profile?.title ?? "",
      site_id: profile?.site_id ?? "",
      estimate_date: profile?.estimate_date ?? null,
      valid_until: profile?.valid_until ?? null,
    },
    stakeholders: mapStakeholders(data?.stakeholders),
    systems: mapSystems(data?.systems),
    line_items: mapLineItems(data?.line_items),
  };
};

const sitePickerOptions = (
  rows: Array<{ id: string; name: string }> | undefined,
): Array<{ value: string; label: string }> =>
  rows?.map((row) => ({
    value: row.id,
    label: row.name,
  })) ?? [];

const ProfileStatus = ({ status }: { status: string }) => {
  const mode = useFieldMode("profile");

  if (mode === "hidden") {
    return null;
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
        Status
      </Typography.Text>
      <Tag color={STATUS_COLORS[status] ?? "default"}>{statusLabel(status)}</Tag>
    </div>
  );
};

export const EstimateDetailForm = ({
  estimateId,
  manifest,
  canNavigateSite,
}: EstimateDetailFormProps) => {
  const isCreate = estimateId === "new";
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { data: detail, isLoading, isFetching, error } = useSurfaceDetail(
    "estimate_detail",
    isCreate ? undefined : estimateId,
  );
  const { data: sitePicker, isLoading: sitePickerLoading } = useEstimateSitePicker();
  const patch = useSurfacePatch("estimate_detail", estimateId);
  const create = useSurfaceListCreate("estimate_list", "estimate_detail");
  const remove = useSurfaceDelete("estimate_detail", estimateId);

  const activeManifest = detail?.manifest ?? manifest;
  const profile = detail?.data.profile as
    | {
        title?: string | null;
        site_id?: string | null;
        site_display_name?: string | null;
        status?: string | null;
      }
    | undefined;

  const defaultValues = useMemo(
    () => (isCreate ? buildDefaultValues(undefined) : buildDefaultValues(detail?.data)),
    [detail?.data, isCreate],
  );

  const resolver = useMemo(() => {
    const baseSchema = (isCreate
      ? EstimateDetailCreateSchema
      : EstimateDetailPatchSchema) as z.ZodObject<z.ZodRawShape>;

    // Server enforces the strict element schemas; the client form rows carry
    // display-only keys (labels, ids), so loosen collection validation here to
    // avoid `unrecognized_keys` blocking submit. Profile stays manifest-narrowed.
    const narrowed = narrowPatchSchema(baseSchema, activeManifest) as z.ZodObject<z.ZodRawShape>;
    const loosened = narrowed.extend({
      stakeholders: z.array(z.object({}).passthrough()).optional(),
      systems: z.array(z.object({}).passthrough()).optional(),
      line_items: z.array(z.object({}).passthrough()).optional(),
    });

    return zodResolver(loosened);
  }, [activeManifest, isCreate]);

  const form = useForm<EstimateDetailFormValues>({
    resolver: resolver as unknown as Resolver<EstimateDetailFormValues>,
    defaultValues,
  });

  const siteOptions = useMemo(() => {
    const options = sitePickerOptions(sitePicker?.data.rows);
    const currentId = profile?.site_id;
    const currentName = profile?.site_display_name;
    if (
      currentId &&
      currentName &&
      !options.some((option) => option.value === currentId)
    ) {
      return [...options, { value: currentId, label: currentName }];
    }
    return options;
  }, [profile?.site_display_name, profile?.site_id, sitePicker?.data.rows]);

  const {
    formState: { isDirty },
  } = form;

  const canSave = patchableFieldIds(activeManifest).length > 0;
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");
  const saving = patch.isPending || create.isPending;
  const siteId = form.watch("profile.site_id");

  const onSave = form.handleSubmit(async (values) => {
    const stakeholders = values.stakeholders ?? [];

    if (
      fieldAllows(activeManifest, "stakeholders", "write") &&
      !validateEstimateStakeholderDuplicates(stakeholders, form.setError)
    ) {
      message.error("Fix duplicate stakeholders before saving");
      return;
    }

    const body: Record<string, unknown> = {
      profile: values.profile,
    };

    if (fieldAllows(activeManifest, "stakeholders", "write")) {
      body.stakeholders = stakeholders.map((row) => ({
        party_id: row.party_id,
        relation_id: row.relation_id,
      }));
    }

    if (fieldAllows(activeManifest, "systems", "write")) {
      body.systems = (values.systems ?? []).map((row, index) => ({
        id: row.id,
        system_id: row.system_id,
        sort_order: index + 1,
        specs: row.specs.map((spec) => ({
          system_spec_def_id: spec.system_spec_def_id,
          system_spec_option_id: spec.system_spec_option_id,
          value_text: spec.value_text,
          value_boolean: spec.value_boolean,
        })),
      }));
    }

    if (fieldAllows(activeManifest, "line_items", "write")) {
      const orderedLines = orderLineItemsForPatch(
        values.systems ?? [],
        values.line_items ?? [],
      );

      body.line_items = orderedLines.map((row) => ({
        id: row.id,
        line_role: row.line_role,
        line_kind: row.line_kind,
        description: row.description,
        quantity: row.quantity,
        unit: row.unit,
        unit_cost: row.unit_cost,
        unit_price: row.unit_price,
        parent_line_id: row.parent_line_id,
        estimate_system_id: row.estimate_system_id,
        material_status: row.material_status,
        phase_id: row.phase_id,
        item_id: row.item_id,
        part_id: row.part_id,
        vendor_part_id: row.vendor_part_id,
      }));
    }

    try {
      if (isCreate) {
        const result = await create.mutateAsync(body);
        const newId = String(result.data.id);
        message.success("Estimate created");
        router.replace(routes.estimates.detail(newId));
        router.refresh();
        return;
      }

      await patch.mutateAsync(body);
      message.success("Estimate saved");
    } catch (saveError) {
      if (saveError instanceof SurfaceApiError) {
        const details = saveError.details as
          | { field?: string; code?: string; party_id?: string; relation_id?: string }
          | undefined;

        if (details?.field === "stakeholders" && details.code === "duplicate") {
          stakeholders.forEach((row, index) => {
            if (
              row.party_id === details.party_id &&
              row.relation_id === details.relation_id
            ) {
              form.setError(`stakeholders.${index}.relation_id`, {
                message: "This party already has this relation on the estimate",
              });
            }
          });
          message.error("Fix duplicate stakeholders before saving");
          return;
        }
      }

      message.error(isCreate ? "Unable to create estimate" : "Unable to save estimate");
    }
  });

  const onRevert = () => {
    form.reset(defaultValues);
    message.info("Reverted to last loaded values");
  };

  const onDelete = () => {
    modal.confirm({
      title: "Delete estimate?",
      content: "This permanently removes the draft estimate.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await remove.mutateAsync();
          message.success("Estimate deleted");
          router.push(routes.estimates.list);
          router.refresh();
        } catch {
          message.error("Unable to delete estimate");
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
        disabled: !canSave || (!isCreate && !isDirty),
        loading: saving,
        onClick: onSave,
      },
      ...(isCreate
        ? []
        : [
            {
              key: "revert",
              label: "Revert",
              icon: <UndoOutlined />,
              priority: "secondary" as const,
              surfaceAction: "write" as const,
              disabled: !isDirty || saving,
              onClick: onRevert,
            },
          ]),
      ...(isCreate
        ? []
        : [
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
          ]),
    ],
    [
      canDelete,
      canSave,
      isCreate,
      isDirty,
      onDelete,
      onRevert,
      onSave,
      remove.isPending,
      saving,
    ],
  );

  useRegisterSurfaceActions(activeManifest, toolbarActions);

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);
  const status = profile?.status ?? "draft";
  const siteDisplayName =
    profile?.site_display_name ??
    siteOptions.find((option) => option.value === siteId)?.label;

  return (
    <SurfaceFormRoot
      manifest={activeManifest}
      loading={initialLoading}
      blocking={blocking}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
      resetKey={isCreate ? "create" : `${estimateId}:${detail?.data?.id ?? ""}`}
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout maxWidth={SURFACE_FORM_MAX_WIDTH}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {isCreate ? "New estimate" : (profile?.title ?? "Estimate")}
          </Typography.Title>

          {fieldAllows(activeManifest, "profile", "read") ? (
            <FormSection title="Profile">
              <TextInput<EstimateDetailFormValues>
                field="profile"
                name="profile.title"
                label="Title"
              />
              <SelectInput<EstimateDetailFormValues>
                field="profile"
                name="profile.site_id"
                label="Site"
                options={siteOptions}
                loading={sitePickerLoading}
                selectProps={{
                  showSearch: true,
                  optionFilterProp: "label",
                }}
              />
              {siteId ? (
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Typography.Text type="secondary">Open:</Typography.Text>
                    {canNavigateSite ? (
                      <Link href={routes.sites.detail(siteId)}>
                        {siteDisplayName ?? siteId}
                      </Link>
                    ) : (
                      <Typography.Text type="secondary">
                        {siteDisplayName ?? siteId}
                      </Typography.Text>
                    )}
                  </Space>
                </div>
              ) : null}
              <DatePickerInput<EstimateDetailFormValues>
                field="profile"
                name="profile.estimate_date"
                label="Estimate date"
              />
              <DatePickerInput<EstimateDetailFormValues>
                field="profile"
                name="profile.valid_until"
                label="Valid until"
              />
              {!isCreate ? <ProfileStatus status={status} /> : null}
            </FormSection>
          ) : null}

          {fieldAllows(activeManifest, "stakeholders", "read") ? (
            <EstimateStakeholderFields manifest={activeManifest} />
          ) : null}

          {fieldAllows(activeManifest, "line_items", "read") ? (
            <EstimateLineTreeTable manifest={activeManifest} />
          ) : null}
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
