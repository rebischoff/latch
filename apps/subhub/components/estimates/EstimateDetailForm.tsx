"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { App, Tabs, Tag, Typography } from "antd";
import { notFound, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { DatePickerInput } from "@/components/form/DatePickerInput";
import {
  EstimateLineTreeTable,
  type EstimateLineFormRow,
  type EstimateScopeFormRow,
} from "@/components/estimates/EstimateLineTreeTable";
import {
  orderLineItemsForPatch,
  type EstimateScopeSpecFormRow,
  type EstimateSiteTreeFormRow,
} from "@/components/estimates/estimate-line-tree";
import { EstimateScopeTab } from "@/components/estimates/EstimateScopeTab";
import {
  EstimateStakeholderFields,
  validateEstimateStakeholderDuplicates,
  type EstimateStakeholderFormRow,
} from "@/components/estimates/EstimateStakeholderFields";
import { FormSection } from "@/components/form/FormSection";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import {
  LinkedSelectControl,
  LinkedSelectInput,
} from "@/components/form/LinkedSelectInput";
import { TextInput } from "@/components/form/TextInput";
import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useApplyPickerReturn } from "@/lib/hooks/use-apply-picker-return";
import { useEstimateSitePicker } from "@/lib/hooks/use-estimate-site-picker";
import { useEstimateSiteTree } from "@/lib/hooks/use-estimate-site-tree";
import { estimateSitePickerKey } from "@/lib/hooks/surface-query-keys";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import {
  EstimateDetailCreateSchema,
  EstimateDetailPatchSchema,
} from "@/lib/estimates/descriptors/estimate-detail";
import { routes } from "@/lib/nav-routes";
import { buildPickerCreateUrl, parseReturnContext } from "@/lib/picker-return-context";
import {
  navigateAfterCreate,
  navigateOnCancel,
  sanitizeReturnTo,
} from "@/lib/surface-navigation";
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
  canCreateSite: boolean;
};

type EstimateDetailFormValues = {
  profile: {
    title: string;
    site_id: string;
    estimate_date: string | null;
    valid_until: string | null;
  };
  stakeholders: EstimateStakeholderFormRow[];
  scopes: EstimateScopeFormRow[];
  site_tree: EstimateSiteTreeFormRow | null;
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

const mapScopes = (rows: unknown): EstimateScopeFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const item = row as Record<string, unknown>;
    const mapSpecs = (specRows: unknown): EstimateScopeSpecFormRow[] =>
      Array.isArray(specRows)
        ? specRows.map((specRow) => {
            const spec = specRow as Record<string, unknown>;
            const valueType =
              spec.value_type === "enum" ||
              spec.value_type === "boolean" ||
              spec.value_type === "text"
                ? spec.value_type
                : undefined;

            return {
              spec_def_id:
                typeof spec.spec_def_id === "string" ? spec.spec_def_id : "",
              def_display_name:
                typeof spec.def_display_name === "string" ? spec.def_display_name : undefined,
              value_type: valueType,
              spec_option_id:
                typeof spec.spec_option_id === "string" ? spec.spec_option_id : null,
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

    const zones = Array.isArray(item.zones)
      ? item.zones.map((zoneRow, zoneIndex) => {
          const zone = zoneRow as Record<string, unknown>;
          return {
            site_zone_id:
              typeof zone.site_zone_id === "string" ? zone.site_zone_id : "",
            sort_order:
              typeof zone.sort_order === "number" ? zone.sort_order : zoneIndex + 1,
            specs: mapSpecs(zone.specs),
          };
        })
      : [];

    return {
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      site_scope_id:
        typeof item.site_scope_id === "string" ? item.site_scope_id : null,
      root_category_id:
        typeof item.root_category_id === "string" ? item.root_category_id : null,
      root_category_name:
        typeof item.root_category_name === "string" ? item.root_category_name : null,
      site_scope_name:
        typeof item.site_scope_name === "string" ? item.site_scope_name : null,
      sort_order: typeof item.sort_order === "number" ? item.sort_order : index + 1,
      labor_context_type_id:
        typeof item.labor_context_type_id === "string" ? item.labor_context_type_id : null,
      markup_type_id: typeof item.markup_type_id === "string" ? item.markup_type_id : null,
      specs: mapSpecs(item.specs),
      zones,
    };
  });
};

const mapSiteTree = (value: unknown): EstimateSiteTreeFormRow | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const tree = value as Record<string, unknown>;
  const mapZones = (rows: unknown): EstimateSiteTreeFormRow["general_zones"] => {
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => {
      const zone = row as Record<string, unknown>;
      const nested = mapZones(zone.zones);
      return {
        id: typeof zone.id === "string" ? zone.id : "",
        name: typeof zone.name === "string" ? zone.name : "",
        ...(nested.length > 0 ? { zones: nested } : {}),
      };
    });
  };

  const specTemplates =
    typeof tree.spec_templates === "object" && tree.spec_templates !== null
      ? (tree.spec_templates as EstimateSiteTreeFormRow["spec_templates"])
      : undefined;

  return {
    scopes: Array.isArray(tree.scopes)
      ? tree.scopes.map((scopeRow) => {
          const scope = scopeRow as Record<string, unknown>;
          return {
            id: typeof scope.id === "string" ? scope.id : "",
            name: typeof scope.name === "string" ? scope.name : "",
            root_category_id:
              typeof scope.root_category_id === "string" ? scope.root_category_id : "",
            zones: mapZones(scope.zones),
          };
        })
      : [],
    general_zones: mapZones(tree.general_zones),
    spec_templates: specTemplates,
  };
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
      estimate_scope_id: asString(item.estimate_scope_id),
      site_zone_id: asString(item.site_zone_id),
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
    scopes: mapScopes(data?.scopes),
    site_tree: mapSiteTree(data?.site_tree),
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
  canCreateSite,
}: EstimateDetailFormProps) => {
  const isCreate = estimateId === "new";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pickerReturn = parseReturnContext(searchParams);
  const persistedPickerSelectedIdRef = useRef<string | null>(null);
  if (pickerReturn.selectedId) {
    persistedPickerSelectedIdRef.current = pickerReturn.selectedId;
  }
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

  const defaultValues = useMemo(() => {
    const base = isCreate
      ? buildDefaultValues(undefined)
      : buildDefaultValues(detail?.data);
    const pickedId = persistedPickerSelectedIdRef.current;
    if (isCreate && pickedId) {
      return {
        ...base,
        profile: {
          ...base.profile,
          site_id: pickedId,
        },
      };
    }
    return base;
  }, [detail?.data, isCreate, pickerReturn.selectedId]);

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
      scopes: z.array(z.object({}).passthrough()).optional(),
      site_tree: z.object({}).passthrough().nullable().optional(),
      line_items: z.array(z.object({}).passthrough()).optional(),
    });

    return zodResolver(loosened);
  }, [activeManifest, isCreate]);

  const form = useForm<EstimateDetailFormValues>({
    resolver: resolver as unknown as Resolver<EstimateDetailFormValues>,
    defaultValues,
  });

  const { setValue, watch } = form;

  useApplyPickerReturn({
    setValue,
    returnField: "profile.site_id",
    pickerQueryKey: estimateSitePickerKey,
  });

  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const siteCreateUrl = useMemo(
    () =>
      buildPickerCreateUrl({
        target: "site",
        returnTo,
        returnField: "profile.site_id",
      }),
    [returnTo],
  );

  const prevSiteIdRef = useRef<string | undefined>(undefined);
  const siteId = watch("profile.site_id");
  const { data: createSiteTreeResponse } = useEstimateSiteTree(
    isCreate && siteId ? siteId : undefined,
  );

  useEffect(() => {
    if (!isCreate) {
      return;
    }

    if (!siteId) {
      setValue("site_tree", null, { shouldDirty: false });
      return;
    }

    const tree = createSiteTreeResponse?.data.site_tree;
    if (!tree) {
      return;
    }

    setValue("site_tree", mapSiteTree(tree), { shouldDirty: false });
  }, [createSiteTreeResponse?.data.site_tree, isCreate, setValue, siteId]);

  useEffect(() => {
    if (!isCreate) {
      return;
    }

    const prev = prevSiteIdRef.current;
    if (prev === undefined) {
      prevSiteIdRef.current = siteId;
      return;
    }

    if (prev !== siteId && prev !== "") {
      setValue("scopes", [], { shouldDirty: true });
      setValue("site_tree", null, { shouldDirty: false });
      setValue("line_items", [], { shouldDirty: true });
    }

    prevSiteIdRef.current = siteId;
  }, [isCreate, setValue, siteId]);

  const siteOptions = useMemo(() => {
    const options = sitePickerOptions(sitePicker?.data.rows);
    const currentId = siteId || profile?.site_id;
    const currentName =
      profile?.site_display_name ??
      options.find((option) => option.value === currentId)?.label;
    if (
      currentId &&
      currentName &&
      !options.some((option) => option.value === currentId)
    ) {
      return [...options, { value: currentId, label: currentName }];
    }
    return options;
  }, [profile?.site_display_name, profile?.site_id, siteId, sitePicker?.data.rows]);

  const {
    formState: { isDirty },
  } = form;

  const canSave = patchableFieldIds(activeManifest).length > 0;
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");
  const saving = patch.isPending || create.isPending;
  const showAddSite =
    canCreateSite && fieldAllows(activeManifest, "profile", "write");
  const showScopeTab =
    fieldAllows(activeManifest, "scopes", "read") && Boolean(siteId);
  const showLineItemsTab =
    fieldAllows(activeManifest, "line_items", "read") && Boolean(siteId);

  const persistEstimate = useCallback(
    async (values: EstimateDetailFormValues, afterCreate: "detail" | "reset") => {
      const stakeholders = values.stakeholders ?? [];

      if (
        fieldAllows(activeManifest, "stakeholders", "write") &&
        !validateEstimateStakeholderDuplicates(stakeholders, form.setError)
      ) {
        message.error("Fix duplicate stakeholders before saving");
        return;
      }

      const profileBody = (() => {
        if (isCreate) {
          return values.profile;
        }
        const { site_id: _siteId, ...rest } = values.profile;
        return rest;
      })();

      const body: Record<string, unknown> = {
        profile: profileBody,
      };

      if (fieldAllows(activeManifest, "stakeholders", "write")) {
        body.stakeholders = stakeholders.map((row) => ({
          party_id: row.party_id,
          relation_id: row.relation_id,
        }));
      }

      if (fieldAllows(activeManifest, "scopes", "write")) {
        body.scopes = (values.scopes ?? []).map((row, index) => ({
          id: row.id,
          site_scope_id: row.site_scope_id,
          root_category_id: row.root_category_id,
          sort_order: index + 1,
          labor_context_type_id: row.labor_context_type_id,
          markup_type_id: row.markup_type_id,
          specs: row.specs.map((spec) => ({
            spec_def_id: spec.spec_def_id,
            spec_option_id: spec.spec_option_id,
            value_text: spec.value_text,
            value_boolean: spec.value_boolean,
          })),
          zones: row.zones.map((zone, zoneIndex) => ({
            site_zone_id: zone.site_zone_id,
            sort_order: zoneIndex + 1,
            specs: zone.specs.map((spec) => ({
              spec_def_id: spec.spec_def_id,
              spec_option_id: spec.spec_option_id,
              value_text: spec.value_text,
              value_boolean: spec.value_boolean,
            })),
          })),
        }));
      }

      if (fieldAllows(activeManifest, "line_items", "write")) {
        const orderedLines = orderLineItemsForPatch(
          values.scopes ?? [],
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
          estimate_scope_id: row.estimate_scope_id,
          site_zone_id: row.site_zone_id,
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

          if (afterCreate === "reset") {
            form.reset(buildDefaultValues(undefined));
            return;
          }

          if (pickerReturn.returnField && returnTo) {
            navigateAfterCreate(router, {
              returnTo: sanitizeReturnTo(returnTo, routes.estimates.list),
              returnField: pickerReturn.returnField,
              newId,
              fallbackList: routes.estimates.list,
              fallbackDetail: routes.estimates.detail,
            });
            return;
          }

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
    },
    [
      activeManifest,
      create,
      form,
      isCreate,
      message,
      patch,
      pickerReturn.returnField,
      returnTo,
      router,
    ],
  );

  const onSave = form.handleSubmit((values) => persistEstimate(values, "detail"));

  const onSaveAndNew = useMemo(
    () =>
      isCreate && !pickerReturn.returnField
        ? form.handleSubmit((values) => persistEstimate(values, "reset"))
        : undefined,
    [form, isCreate, persistEstimate, pickerReturn.returnField],
  );

  const onCancel = useCallback(() => {
    const navigate = () => {
      navigateOnCancel(router, returnTo, routes.estimates.list);
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
    form.reset(defaultValues);
    message.info("Reverted to last loaded values");
  }, [defaultValues, form, message]);

  const onDelete = useCallback(() => {
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
  }, [message, modal, remove, router]);

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

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);
  const status = profile?.status ?? "draft";

  const generalTab = (
    <>
      {fieldAllows(activeManifest, "profile", "read") ? (
        <FormSection title="Profile">
          <TextInput<EstimateDetailFormValues>
            field="profile"
            name="profile.title"
            label="Title"
          />
          {isCreate ? (
            <LinkedSelectInput<EstimateDetailFormValues>
              field="profile"
              name="profile.site_id"
              label="Site"
              options={siteOptions}
              loading={sitePickerLoading}
              canLink={canNavigateSite}
              linkHref={routes.sites.detail}
              canAddNew={showAddSite}
              addNewHref={siteCreateUrl}
              addNewLabel="Add site"
              selectProps={{
                showSearch: true,
                optionFilterProp: "label",
              }}
            />
          ) : (
            <FormFieldItem label="Site">
              <LinkedSelectControl
                mode="read"
                value={siteId}
                options={siteOptions}
                loading={sitePickerLoading}
                canLink={canNavigateSite}
                linkHref={routes.sites.detail}
              />
            </FormFieldItem>
          )}
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

      {fieldAllows(activeManifest, "line_items", "read") && !siteId ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Select a site to configure scopes and line items.
        </Typography.Paragraph>
      ) : null}

      {fieldAllows(activeManifest, "stakeholders", "read") ? (
        <EstimateStakeholderFields manifest={activeManifest} />
      ) : null}
    </>
  );

  const scopeTab = showScopeTab ? <EstimateScopeTab manifest={activeManifest} /> : null;

  const lineItemsTab = showLineItemsTab ? (
    <EstimateLineTreeTable
      key={siteId}
      manifest={activeManifest}
      siteSelected={Boolean(siteId)}
    />
  ) : null;

  const tabItems = [
    ...(fieldAllows(activeManifest, "profile", "read") ||
    fieldAllows(activeManifest, "stakeholders", "read")
      ? [{ key: "general", label: "General", children: generalTab }]
      : []),
    ...(showScopeTab
      ? [{ key: "scope", label: "Scope", children: scopeTab }]
      : []),
    ...(showLineItemsTab
      ? [{ key: "line-items", label: "Line Items", children: lineItemsTab }]
      : []),
  ];

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

          {tabItems.length > 0 ? <Tabs items={tabItems} /> : null}
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
