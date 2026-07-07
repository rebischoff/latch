"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { App } from "antd";
import { Badge, Select, TreeSelect, Typography } from "antd";
import type { TreeSelectProps } from "antd";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { ItemCommercialFields, validateItemLaborPhaseDuplicates } from "@/components/catalog/ItemCommercialFields";
import { ItemSpecDefinitionsField } from "@/components/catalog/ItemSpecDefinitionsField";
import { FormSection } from "@/components/form/FormSection";
import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import { InputNumberInput } from "@/components/form/InputNumberInput";
import { TextInput } from "@/components/form/TextInput";
import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { useMasterDetailSelectionOptional } from "@/components/shell/MasterDetailSelectionContext";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useItemTreePicker } from "@/lib/hooks/use-item-tree-picker";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import {
  ItemDetailCreateSchema,
  ItemDetailPatchSchema,
} from "@/lib/catalog/descriptors/item-detail";
import { routes } from "@/lib/nav-routes";
import {
  navigateAfterCreate,
  navigateOnCancel,
  sanitizeReturnTo,
} from "@/lib/surface-navigation";
import { SurfaceApiError } from "@/lib/surface-api";

type ItemDetailFormProps = {
  categoryId: string;
  manifest: Manifest;
  parentId?: string | null;
  returnTo?: string | null;
};

export type ItemDetailFormValues = {
  profile: {
    name: string;
    sort_order: number;
    csi_code?: string | null;
    node_type?: "scope" | "category" | "item";
    parent_id?: string | null;
    parent_name?: string | null;
    root_item_id?: string | null;
    root_item_name?: string | null;
    is_root?: boolean;
  };
  spec_definitions: Array<{
    id?: string;
    code?: string | null;
    display_name: string;
    value_type: "boolean" | "enum" | "text";
    filter_mode?: "prefer" | "required";
    sort_order?: number;
    options: Array<{
      id?: string;
      code?: string | null;
      display_name: string;
      sort_order?: number;
    }>;
  }>;
  spec_participation: {
    participates: Array<{
      spec_def_id: string;
      display_name: string;
      value_type: "boolean" | "enum" | "text";
      active: boolean;
      assign_item_id: string | null;
      excluded_here: boolean;
      state: "assigned" | "inherited" | "excluded" | "inactive";
    }>;
  };
  commercial: {
    freight_rate_type_id: string | null;
    incidental_rate_type_id: string | null;
    markup_type_id: string | null;
    fallback_unit_cost?: number;
  };
  item_labor_phase: Array<{
    labor_phase_id: string;
    labor_phase_name?: string;
    labor_rate_type_id: string;
    labor_rate_type_name?: string;
    hours_per_unit: number;
    sort_order?: number;
  }>;
};

const emptySpecParticipation = (): ItemDetailFormValues["spec_participation"] => ({
  participates: [],
});

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
  isCreate: boolean,
  parentId?: string | null,
): ItemDetailFormValues => {
  if (isCreate) {
    return {
      profile: {
        name: "",
        sort_order: 0,
        csi_code: null,
        ...(parentId ? { parent_id: parentId } : {}),
      },
      spec_definitions: [],
      spec_participation: emptySpecParticipation(),
      commercial: {
        freight_rate_type_id: null,
        incidental_rate_type_id: null,
        markup_type_id: null,
        fallback_unit_cost: 0,
      },
      item_labor_phase: [],
    };
  }

  const profile = data?.profile as ItemDetailFormValues["profile"] | undefined;
  const specParticipation = data?.spec_participation as
    | ItemDetailFormValues["spec_participation"]
    | undefined;
  const commercial = data?.commercial as ItemDetailFormValues["commercial"] | undefined;

  return {
    profile: {
      name: profile?.name ?? "",
      sort_order: profile?.sort_order ?? 0,
      csi_code: profile?.csi_code ?? null,
      node_type: profile?.node_type ?? "category",
      parent_id: profile?.parent_id ?? null,
      parent_name: profile?.parent_name ?? null,
      root_item_id: profile?.root_item_id ?? null,
      root_item_name: profile?.root_item_name ?? null,
      is_root: profile?.is_root ?? false,
    },
    spec_definitions: Array.isArray(data?.spec_definitions)
      ? (data.spec_definitions as ItemDetailFormValues["spec_definitions"])
      : [],
    spec_participation: specParticipation ?? emptySpecParticipation(),
    commercial: {
      freight_rate_type_id: commercial?.freight_rate_type_id ?? null,
      incidental_rate_type_id: commercial?.incidental_rate_type_id ?? null,
      markup_type_id: commercial?.markup_type_id ?? null,
      fallback_unit_cost: commercial?.fallback_unit_cost ?? 0,
    },
    item_labor_phase: Array.isArray(data?.item_labor_phase)
      ? (data.item_labor_phase as ItemDetailFormValues["item_labor_phase"])
      : [],
  };
};

const specDefinitionOwnerId = (
  values: ItemDetailFormValues,
  row: ItemDetailFormValues["spec_definitions"][number],
): string | null | undefined => {
  if (!row.id) {
    return undefined;
  }
  return values.spec_participation.participates.find((participation) => participation.spec_def_id === row.id)
    ?.assign_item_id;
};

/** Only defs owned by this category (or new rows at root) belong in the patch body. */
const patchableSpecDefinitions = (
  values: ItemDetailFormValues,
  categoryId: string,
  isRoot: boolean,
): ItemDetailFormValues["spec_definitions"] =>
  values.spec_definitions.filter((row) => {
    if (!row.id) {
      return isRoot;
    }
    return specDefinitionOwnerId(values, row) === categoryId;
  });

const toPatchBody = (
  values: ItemDetailFormValues,
  manifest: Manifest,
  isRoot: boolean,
  categoryId: string,
): Record<string, unknown> => {
  const patchable = patchableFieldIds(manifest);
  const body: Record<string, unknown> = {};

  if (patchable.includes("profile")) {
    body.profile = {
      name: values.profile.name,
      sort_order: values.profile.sort_order,
      csi_code: values.profile.csi_code ?? null,
      ...(values.profile.parent_id !== undefined
        ? { parent_id: values.profile.parent_id }
        : {}),
      ...(values.profile.node_type ? { node_type: values.profile.node_type } : {}),
    };
  }

  if (patchable.includes("spec_definitions")) {
    const ownedRows = patchableSpecDefinitions(values, categoryId, isRoot);
    body.spec_definitions = ownedRows.map((row, index) => ({
      ...(row.id ? { id: row.id } : {}),
      code: row.code ?? null,
      display_name: row.display_name,
      value_type: row.value_type,
      filter_mode: row.filter_mode ?? "required",
      sort_order: row.sort_order ?? index + 1,
      options:
        row.value_type === "enum"
          ? row.options.map((option, optionIndex) => ({
              ...(option.id ? { id: option.id } : {}),
              code: option.code ?? null,
              display_name: option.display_name,
              sort_order: option.sort_order ?? optionIndex + 1,
            }))
          : [],
    }));
  }

  if (patchable.includes("spec_participation")) {
    body.spec_participation = {
      participates: values.spec_participation.participates.map((row) => ({
        spec_def_id: row.spec_def_id,
        active: row.active,
      })),
    };
  }

  if (patchable.includes("commercial")) {
    body.commercial = {
      ...(values.profile.node_type === "scope" || values.profile.node_type === "category"
        ? {
            freight_rate_type_id: values.commercial.freight_rate_type_id,
            incidental_rate_type_id: values.commercial.incidental_rate_type_id,
            markup_type_id: values.commercial.markup_type_id,
          }
        : {}),
      ...(values.profile.node_type === "item"
        ? { fallback_unit_cost: values.commercial.fallback_unit_cost ?? 0 }
        : {}),
    };
  }

  if (patchable.includes("item_labor_phase")) {
    body.item_labor_phase = values.item_labor_phase
      .filter((row) => row.labor_phase_id && row.labor_rate_type_id)
      .map((row, index) => ({
        labor_phase_id: row.labor_phase_id,
        labor_rate_type_id: row.labor_rate_type_id,
        hours_per_unit: row.hours_per_unit,
        sort_order: row.sort_order ?? index + 1,
      }));
  }

  return body;
};

export const ItemDetailForm = ({
  categoryId,
  manifest,
  parentId,
  returnTo = null,
}: ItemDetailFormProps) => {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const isCreate = categoryId === "new";
  const detailQuery = useSurfaceDetail(
    "item_detail",
    isCreate ? undefined : categoryId,
  );
  const patchMutation = useSurfacePatch("item_detail", categoryId);
  const deleteMutation = useSurfaceDelete("item_detail", categoryId);
  const createMutation = useSurfaceListCreate("item_list", "item_detail");
  const initialValuesRef = useRef<ItemDetailFormValues | null>(null);
  const selection = useMasterDetailSelectionOptional();

  const activeManifest = detailQuery.data?.manifest ?? manifest;

  const defaultValues = useMemo(
    () => buildDefaultValues(detailQuery.data?.data, isCreate, parentId),
    [detailQuery.data?.data, isCreate, parentId],
  );

  const resolver = useMemo(() => {
    const baseSchema = (
      isCreate ? ItemDetailCreateSchema : ItemDetailPatchSchema
    ) as z.ZodObject<z.ZodRawShape>;
    const narrowed = narrowPatchSchema(baseSchema, activeManifest) as z.ZodObject<z.ZodRawShape>;
    const loosened = narrowed.extend({
      // Server enforces strict profile schema; form carries read-only display keys.
      profile: z.object({}).passthrough().optional(),
      spec_definitions: z.array(z.object({}).passthrough()).optional(),
      spec_participation: z.object({}).passthrough().optional(),
      commercial: z.object({}).passthrough().optional(),
      item_labor_phase: z.array(z.object({}).passthrough()).optional(),
    });

    return zodResolver(loosened);
  }, [activeManifest, isCreate]);

  const form = useForm<ItemDetailFormValues>({
    resolver: resolver as unknown as Resolver<ItemDetailFormValues>,
    defaultValues,
    values: isCreate ? undefined : defaultValues,
  });

  const {
    formState: { isDirty },
  } = form;

  const isRoot = form.watch("profile.is_root") ?? false;
  const nodeType = form.watch("profile.node_type") ?? "category";
  const { data: reparentTree, isLoading: reparentTreeLoading } = useItemTreePicker();
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");
  const canSave = patchableFieldIds(activeManifest).length > 0;
  const saving = patchMutation.isPending || createMutation.isPending;

  const buildCreateProfile = useCallback(
    (profile: ItemDetailFormValues["profile"]) => {
      const resolvedParentId = parentId ?? profile.parent_id;
      return {
        name: profile.name,
        sort_order: profile.sort_order,
        csi_code: profile.csi_code ?? null,
        ...(resolvedParentId ? { parent_id: resolvedParentId } : {}),
      };
    },
    [parentId],
  );

  const persistCategory = useCallback(
    async (values: ItemDetailFormValues, afterCreate: "detail" | "reset") => {
      if (
        patchableFieldIds(activeManifest).includes("item_labor_phase") &&
        !validateItemLaborPhaseDuplicates(values.item_labor_phase, form.setError)
      ) {
        message.error("Fix labor phase errors before saving");
        return;
      }

      try {
        if (isCreate) {
          const result = await createMutation.mutateAsync({
            profile: buildCreateProfile(values.profile),
          });
          const newId = String(result.data.id);
          message.success("Category created");

          if (afterCreate === "reset") {
            form.reset(buildDefaultValues(undefined, true, parentId));
            return;
          }

          selection?.setSelectedId(newId);

          if (returnTo) {
            navigateAfterCreate(router, {
              returnTo: sanitizeReturnTo(returnTo, routes.items.list),
              newId,
              fallbackList: routes.items.list,
              fallbackDetail: routes.items.detail,
            });
            return;
          }

          router.replace(routes.items.detail(newId));
          router.refresh();
          return;
        }

        const body = toPatchBody(values, activeManifest, isRoot, categoryId);
        await patchMutation.mutateAsync(body);
        message.success("Category saved");
        form.reset(values);
        initialValuesRef.current = values;
      } catch (error) {
        if (error instanceof SurfaceApiError) {
          const details = error.details as
            | {
                field?: string;
                code?: string;
                part_count?: number;
              }
            | undefined;

          if (details?.field === "spec_definitions" && details.code === "spec_option_in_use") {
            const count = details.part_count ?? 1;
            message.error(
              count === 1
                ? "1 part uses this option on compatibility specs — update that part first."
                : `${count} parts use this option on compatibility specs — update those parts first.`,
            );
            return;
          }
        }

        const text =
          error instanceof SurfaceApiError ? error.message : "Unable to save category";
        message.error(text);
      }
    },
    [
      activeManifest,
      buildCreateProfile,
      createMutation,
      form,
      isCreate,
      isRoot,
      message,
      parentId,
      patchMutation,
      returnTo,
      router,
      selection,
    ],
  );

  const onSave = form.handleSubmit((values) => persistCategory(values, "detail"));

  const onSaveAndNew = useMemo(
    () =>
      isCreate && !returnTo
        ? form.handleSubmit((values) => persistCategory(values, "reset"))
        : undefined,
    [form, isCreate, persistCategory, returnTo],
  );

  const onCancel = useCallback(() => {
    const navigate = () => {
      navigateOnCancel(router, returnTo, routes.items.list);
    };

    if (isDirty) {
      modal.confirm({
        title: "Leave without saving?",
        content: "Unsaved changes will be lost.",
        okText: "Leave",
        onOk: navigate,
      });
      return;
    }

    navigate();
  }, [isDirty, modal, returnTo, router]);

  const onRevert = useCallback(() => {
    form.reset(initialValuesRef.current ?? defaultValues);
    message.info("Reverted to last loaded values");
  }, [defaultValues, form, message]);

  const onDelete = useCallback(() => {
    modal.confirm({
      title: "Delete category?",
      content: "This permanently removes the category.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync();
          message.success("Category deleted");
          router.push(routes.items.list);
        } catch (error) {
          const text =
            error instanceof SurfaceApiError ? error.message : "Unable to delete category";
          message.error(text);
        }
      },
    });
  }, [deleteMutation, message, modal, router]);

  useSurfaceFormChrome({
    mode: isCreate ? "create" : "edit",
    manifest: activeManifest,
    canSave,
    saving,
    onSave,
    isDirty,
    canDelete,
    onDelete: isCreate ? undefined : onDelete,
    onRevert: isCreate ? undefined : onRevert,
    onCancel: isCreate ? onCancel : undefined,
    onSaveAndNew,
  });

  if (!isCreate && detailQuery.error instanceof SurfaceApiError && detailQuery.error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && detailQuery.isLoading && !detailQuery.data;
  const blocking = !isCreate && detailQuery.isFetching && Boolean(detailQuery.data);

  return (
    <SurfaceFormRoot
      manifest={activeManifest}
      loading={initialLoading}
      blocking={blocking}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
      resetKey={isCreate ? "create" : `${categoryId}:${detailQuery.data?.data?.id ?? ""}`}
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout maxWidth={SURFACE_FORM_MAX_WIDTH}>
        <FormSection title="Profile">
          {fieldAllows(activeManifest, "profile", "read") ? (
            <>
              {!isCreate ? (
                <div style={{ marginBottom: 12 }}>
                  <Typography.Text type="secondary" style={{ marginRight: 8 }}>
                    Role
                  </Typography.Text>
                  <Badge
                    count={nodeType}
                    style={{
                      backgroundColor:
                        nodeType === "item"
                          ? "#52c41a"
                          : nodeType === "scope"
                            ? "#1677ff"
                            : "#8c8c8c",
                    }}
                  />
                  {!isRoot && fieldAllows(activeManifest, "profile", "write") ? (
                    <Select
                      style={{ marginLeft: 12, minWidth: 140 }}
                      value={nodeType}
                      disabled={saving}
                      options={[
                        { value: "category", label: "Category" },
                        { value: "item", label: "Quotable item" },
                      ]}
                      onChange={(value) =>
                        form.setValue("profile.node_type", value, { shouldDirty: true })
                      }
                    />
                  ) : null}
                </div>
              ) : null}
              <TextInput<ItemDetailFormValues>
                field="profile"
                name="profile.name"
                label="Name"
              />
              <InputNumberInput<ItemDetailFormValues>
                field="profile"
                name="profile.sort_order"
                label="Sort order"
              />
              <TextInput<ItemDetailFormValues>
                field="profile"
                name="profile.csi_code"
                label="CSI code"
              />
              {!isCreate && !isRoot && fieldAllows(activeManifest, "profile", "write") ? (
                <div style={{ marginBottom: 16 }}>
                  <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                    Parent
                  </Typography.Text>
                  <TreeSelect
                    allowClear={false}
                    loading={reparentTreeLoading}
                    style={{ width: "100%" }}
                    value={form.watch("profile.parent_id") ?? undefined}
                    treeData={(reparentTree ?? []).map((root) => ({
                      value: root.value,
                      title: root.label,
                      selectable: root.selectable,
                      disabled: root.value === categoryId,
                      children: root.children?.map((child) => ({
                        value: child.value,
                        title: child.label,
                        selectable: child.selectable,
                        disabled: child.value === categoryId,
                        children: child.children as TreeSelectProps["treeData"],
                      })),
                    }))}
                    onChange={(value) =>
                      form.setValue("profile.parent_id", String(value), { shouldDirty: true })
                    }
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </FormSection>

        <ItemSpecDefinitionsField
          categoryId={categoryId}
          isCreate={isCreate}
          manifest={activeManifest}
        />

        <ItemCommercialFields manifest={activeManifest} nodeType={nodeType} />
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
