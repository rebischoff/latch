"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { App } from "antd";
import { Checkbox, Tabs, Typography } from "antd";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import {
  ItemCommercialFields,
  validateItemLaborPhaseDuplicates,
  validateItemLaborPhaseRowsComplete,
} from "@/components/catalog/ItemCommercialFields";
import { ItemSpecDefinitionsField } from "@/components/catalog/ItemSpecDefinitionsField";
import { FormSection } from "@/components/form/FormSection";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import { TextInput } from "@/components/form/TextInput";
import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { useMasterDetailSelectionOptional } from "@/components/shell/MasterDetailSelectionContext";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { toSpecDefinitionPatchRow } from "@/lib/catalog/item-spec-definitions-form";
import { useDetailTab } from "@/lib/hooks/use-detail-tab";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
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
    has_children?: boolean;
    in_use?: boolean;
  };
  spec_definitions: Array<{
    id?: string;
    display_name: string;
    value_type: "boolean" | "enum" | "number";
    unit_id?: string | null;
    decimal_places?: number | null;
    unit_symbol?: string | null;
    to_canonical_factor?: number | null;
    sort_order?: number;
    options: Array<{
      id?: string;
      display_name: string;
      sort_order?: number;
    }>;
    in_use_part_count?: number;
  }>;
  commercial: {
    freight_rate_type_id: string | null;
    incidental_rate_type_id: string | null;
    markup_type_id: string | null;
    fallback_unit_cost?: number;
    material_phase_id: string | null;
  };
  item_labor_phase: Array<{
    labor_phase_id: string;
    labor_phase_name?: string;
    labor_rate_type_id: string;
    labor_rate_type_name?: string;
    hours_per_unit: number;
    sort_order?: number;
  }>;
  resolved_labor_phase: Array<{
    labor_phase_id: string;
    labor_phase_name?: string;
    labor_rate_type_id: string;
    labor_rate_type_name?: string;
    hours_per_unit: number;
    sort_order?: number;
    origin: "own" | "inherited";
    source_item_id: string | null;
    source_item_name: string | null;
  }>;
};

const emptySpecDefinitions = (): ItemDetailFormValues["spec_definitions"] => [];

const buildCreateInheritedLaborRows = (
  data: Record<string, unknown> | undefined,
  parentId?: string | null,
): ItemDetailFormValues["resolved_labor_phase"] => {
  if (!Array.isArray(data?.resolved_labor_phase) || !parentId) {
    return [];
  }

  const parentProfile = data.profile as { name?: string } | undefined;
  const parentName = parentProfile?.name ?? null;

  return (data.resolved_labor_phase as ItemDetailFormValues["resolved_labor_phase"]).map(
    (row) => ({
      ...row,
      origin: "inherited",
      source_item_id: row.origin === "own" ? parentId : row.source_item_id,
      source_item_name: row.origin === "own" ? parentName : row.source_item_name,
    }),
  );
};

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
        ...(parentId
          ? { parent_id: parentId, node_type: "category" as const }
          : { node_type: "scope" as const, is_root: true }),
      },
      spec_definitions: emptySpecDefinitions(),
      commercial: {
        freight_rate_type_id: null,
        incidental_rate_type_id: null,
        markup_type_id: null,
        fallback_unit_cost: 0,
        material_phase_id: null,
      },
      item_labor_phase: [],
      resolved_labor_phase: buildCreateInheritedLaborRows(data, parentId),
    };
  }

  const profile = data?.profile as ItemDetailFormValues["profile"] | undefined;
  const specDefinitions = Array.isArray(data?.spec_definitions)
    ? (data.spec_definitions as ItemDetailFormValues["spec_definitions"])
    : [];
  const commercial = data?.commercial as ItemDetailFormValues["commercial"] | undefined;

  const ownRows = Array.isArray(data?.item_labor_phase)
    ? (data.item_labor_phase as ItemDetailFormValues["item_labor_phase"])
    : [];
  const resolvedRows = Array.isArray(data?.resolved_labor_phase)
    ? (data.resolved_labor_phase as ItemDetailFormValues["resolved_labor_phase"])
    : [];

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
      has_children: profile?.has_children ?? false,
      in_use: profile?.in_use ?? false,
    },
    spec_definitions: specDefinitions,
    commercial: {
      freight_rate_type_id: commercial?.freight_rate_type_id ?? null,
      incidental_rate_type_id: commercial?.incidental_rate_type_id ?? null,
      markup_type_id: commercial?.markup_type_id ?? null,
      fallback_unit_cost: commercial?.fallback_unit_cost ?? 0,
      material_phase_id: commercial?.material_phase_id ?? null,
    },
    item_labor_phase: ownRows,
    resolved_labor_phase: resolvedRows,
  };
};

const toPatchBody = (
  values: ItemDetailFormValues,
  manifest: Manifest,
): Record<string, unknown> => {
  const patchable = patchableFieldIds(manifest);
  const body: Record<string, unknown> = {};

  if (patchable.includes("profile")) {
    body.profile = {
      name: values.profile.name,
      csi_code: values.profile.csi_code ?? null,
      ...(values.profile.node_type && values.profile.node_type !== "scope"
        ? { node_type: values.profile.node_type }
        : {}),
    };
  }

  if (patchable.includes("spec_definitions") && values.profile.node_type === "scope") {
    body.spec_definitions = values.spec_definitions.map((row, index) =>
      toSpecDefinitionPatchRow(row, index),
    );
  }

  if (patchable.includes("commercial")) {
    body.commercial = {
      freight_rate_type_id: values.commercial.freight_rate_type_id,
      incidental_rate_type_id: values.commercial.incidental_rate_type_id,
      markup_type_id: values.commercial.markup_type_id,
      ...(values.profile.node_type !== "scope"
        ? { material_phase_id: values.commercial.material_phase_id }
        : {}),
      ...(values.profile.node_type === "item"
        ? { fallback_unit_cost: values.commercial.fallback_unit_cost ?? 0 }
        : {}),
    };
  }

  if (
    patchable.includes("item_labor_phase") &&
    values.profile.node_type !== "scope"
  ) {
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
  const parentDetailQuery = useSurfaceDetail(
    "item_detail",
    isCreate ? (parentId ?? undefined) : undefined,
  );
  const patchMutation = useSurfacePatch("item_detail", categoryId);
  const deleteMutation = useSurfaceDelete("item_detail", categoryId);
  const createMutation = useSurfaceListCreate("item_list", "item_detail");
  const initialValuesRef = useRef<ItemDetailFormValues | null>(null);
  const selection = useMasterDetailSelectionOptional();

  const activeManifest = detailQuery.data?.manifest ?? manifest;

  const defaultValues = useMemo(
    () =>
      buildDefaultValues(
        isCreate ? parentDetailQuery.data?.data : detailQuery.data?.data,
        isCreate,
        parentId,
      ),
    [detailQuery.data?.data, isCreate, parentDetailQuery.data?.data, parentId],
  );

  const resolver = useMemo(() => {
    // Client carries read-only display keys; server validates PATCH via narrowPatchSchema.
    const formSchema = z
      .object({
        profile: z.object({}).passthrough().optional(),
        commercial: z.object({}).passthrough().optional(),
        item_labor_phase: z.array(z.object({}).passthrough()).optional(),
        spec_definitions: z.array(z.object({}).passthrough()).optional(),
        resolved_labor_phase: z.array(z.object({}).passthrough()).optional(),
      })
      .passthrough();

    return zodResolver(formSchema);
  }, []);

  const form = useForm<ItemDetailFormValues>({
    resolver: resolver as unknown as Resolver<ItemDetailFormValues>,
    defaultValues,
  });

  const {
    formState: { isDirty },
  } = form;

  const isRoot = form.watch("profile.is_root") ?? false;
  const nodeType = form.watch("profile.node_type") ?? "category";
  const hasChildren = form.watch("profile.has_children") ?? false;
  const inUse = form.watch("profile.in_use") ?? false;
  const canSave = patchableFieldIds(activeManifest).length > 0;
  const saving = patchMutation.isPending || createMutation.isPending;
  const showQuotableControl = !isRoot && (isCreate ? Boolean(parentId) : true);
  const quotableCheckboxDisabled = saving || hasChildren || inUse;
  const canWriteProfile = fieldAllows(activeManifest, "profile", "write");
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");

  const buildCreateProfile = useCallback(
    (profile: ItemDetailFormValues["profile"]) => {
      const resolvedParentId = parentId ?? profile.parent_id;
      return {
        name: profile.name,
        csi_code: profile.csi_code ?? null,
        ...(resolvedParentId ? { parent_id: resolvedParentId } : {}),
        ...(profile.node_type === "item" ? { node_type: "item" as const } : {}),
      };
    },
    [parentId],
  );

  const persistCategory = useCallback(
    async (values: ItemDetailFormValues, afterCreate: "detail" | "reset") => {
      const laborPhasePatchable = patchableFieldIds(activeManifest).includes(
        "item_labor_phase",
      );
      if (laborPhasePatchable && values.profile.node_type !== "scope") {
        const laborValid =
          validateItemLaborPhaseDuplicates(values.item_labor_phase, form.setError) &&
          validateItemLaborPhaseRowsComplete(values.item_labor_phase, form.setError);
        if (!laborValid) {
          message.error("Fix labor phase errors before saving");
          return;
        }
      }

      try {
        if (isCreate) {
          const body = toPatchBody(values, activeManifest);
          if (patchableFieldIds(activeManifest).includes("profile")) {
            body.profile = {
              ...(body.profile as Record<string, unknown> | undefined),
              ...buildCreateProfile(values.profile),
            };
          }
          const result = await createMutation.mutateAsync(body);
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

        const body = toPatchBody(values, activeManifest);
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

          if (
            (details?.field === "options" || details?.field === "spec_definitions") &&
            details.code === "spec_option_in_use"
          ) {
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
      message,
      parentId,
      patchMutation,
      returnTo,
      router,
      selection,
    ],
  );

  const onSave = form.handleSubmit(
    (values) => persistCategory(values, "detail"),
    () => {
      message.error("Fix form errors before saving");
    },
  );

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

  const initialLoading = isCreate
    ? Boolean(parentId) && parentDetailQuery.isLoading && !parentDetailQuery.data
    : detailQuery.isLoading && !detailQuery.data;
  const blocking = !isCreate && detailQuery.isFetching && Boolean(detailQuery.data);
  const showSpecsTab =
    nodeType === "scope" && fieldAllows(activeManifest, "spec_definitions", "read");
  const availableKeys = showSpecsTab
    ? (["general", "specs"] as const)
    : (["general"] as const);
  const serverNodeType = (
    detailQuery.data?.data?.profile as { node_type?: "scope" | "category" | "item" } | undefined
  )?.node_type;
  const { activeKey, setTab } = useDetailTab({
    availableKeys,
    defaultKey: "general",
    ready: isCreate || Boolean(serverNodeType) || Boolean(detailQuery.error),
  });

  const generalContent = (
    <>
      <FormSection title="Profile">
        {fieldAllows(activeManifest, "profile", "read") ? (
          <>
            <TextInput<ItemDetailFormValues>
              field="profile"
              name="profile.name"
              label="Name"
            />
            {showQuotableControl ? (
              <FormFieldItem
                label="Quotable"
                help={
                  hasChildren
                    ? "Remove child items before marking as quotable."
                    : inUse
                      ? "Referenced on an estimate or job line — cannot change."
                      : undefined
                }
              >
                {canWriteProfile ? (
                  <Checkbox
                    checked={nodeType === "item"}
                    disabled={quotableCheckboxDisabled}
                    onChange={(event) =>
                      form.setValue(
                        "profile.node_type",
                        event.target.checked ? "item" : "category",
                        { shouldDirty: true },
                      )
                    }
                  />
                ) : (
                  <Typography.Text>{nodeType === "item" ? "Yes" : "No"}</Typography.Text>
                )}
              </FormFieldItem>
            ) : null}
            <TextInput<ItemDetailFormValues>
              field="profile"
              name="profile.csi_code"
              label="CSI code"
            />
          </>
        ) : null}
      </FormSection>

      <ItemCommercialFields
        categoryId={categoryId}
        isCreate={isCreate}
        manifest={activeManifest}
        nodeType={nodeType}
      />
    </>
  );

  return (
    <SurfaceFormRoot
      manifest={activeManifest}
      loading={initialLoading}
      blocking={blocking}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
      resetKey={
        isCreate
          ? "create"
          : `${categoryId}:${detailQuery.data?.data?.id ?? ""}:${serverNodeType ?? "loading"}`
      }
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout>
          {showSpecsTab ? (
            <Tabs
              activeKey={activeKey}
              onChange={setTab}
              items={[
                { key: "general", label: "General", children: generalContent },
                {
                  key: "specs",
                  label: "Specs",
                  children: (
                    <ItemSpecDefinitionsField isCreate={isCreate} manifest={activeManifest} />
                  ),
                },
              ]}
            />
          ) : (
            generalContent
          )}
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
