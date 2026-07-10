"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { App, Tag, Typography } from "antd";
import { notFound, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { DatePickerInput } from "@/components/form/DatePickerInput";
import {
  EstimateLineItemsPanels,
} from "@/components/estimates/EstimateLineItemsPanels";
import type {
  EstimateConditionFormRow,
  EstimateLineFormRow,
} from "@/components/estimates/estimate-line-tree";
import {
  orderLineItemsForPatch,
  type EstimateConditionLaborPhaseFormRow,
  type EstimateConditionSpecFormRow,
  type EstimateSiteScopeTreeFormRow,
  type EstimateSiteTreeFormRow,
} from "@/components/estimates/estimate-line-tree";
import {
  estimateScopeSpecToPatchBody,
  estimateScopeSpecsToDisplay,
} from "@/lib/estimates/estimate-scope-spec-form";
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
import { DetailHeader } from "@/components/surface/DetailHeader";
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
  conditions: EstimateConditionFormRow[];
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

const mapConditions = (rows: unknown): EstimateConditionFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const mapSpecs = (specRows: unknown): EstimateConditionSpecFormRow[] => {
    const mapped = Array.isArray(specRows)
      ? specRows.map((specRow) => {
          const spec = specRow as Record<string, unknown>;
          const valueType =
            spec.value_type === "enum" ||
            spec.value_type === "boolean" ||
            spec.value_type === "number"
              ? spec.value_type
              : undefined;

          return {
            spec_def_id: typeof spec.spec_def_id === "string" ? spec.spec_def_id : "",
            def_display_name:
              typeof spec.def_display_name === "string" ? spec.def_display_name : undefined,
            value_type: valueType,
            spec_option_id:
              typeof spec.spec_option_id === "string" ? spec.spec_option_id : null,
            option_display_name:
              typeof spec.option_display_name === "string"
                ? spec.option_display_name
                : undefined,
            value_number: typeof spec.value_number === "number" ? spec.value_number : null,
            value_boolean:
              typeof spec.value_boolean === "boolean" ? spec.value_boolean : null,
            unit_symbol: typeof spec.unit_symbol === "string" ? spec.unit_symbol : null,
            to_canonical_factor:
              typeof spec.to_canonical_factor === "number"
                ? spec.to_canonical_factor
                : undefined,
            decimal_places:
              typeof spec.decimal_places === "number" ? spec.decimal_places : null,
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

    return estimateScopeSpecsToDisplay(mapped as EstimateConditionSpecFormRow[]);
  };

  const mapLaborPhases = (phaseRows: unknown): EstimateConditionLaborPhaseFormRow[] => {
    if (!Array.isArray(phaseRows)) {
      return [];
    }

    const mapped: Array<EstimateConditionLaborPhaseFormRow | null> = phaseRows.map(
      (phaseRow) => {
        const phase = phaseRow as Record<string, unknown>;
        if (typeof phase.labor_phase_id !== "string") {
          return null;
        }
        return {
          labor_phase_id: phase.labor_phase_id,
          labor_phase_name:
            typeof phase.labor_phase_name === "string" ? phase.labor_phase_name : undefined,
          sort_order: typeof phase.sort_order === "number" ? phase.sort_order : undefined,
        };
      },
    );

    return mapped.filter(
      (row): row is EstimateConditionLaborPhaseFormRow => row !== null,
    );
  };

  const mapTree = (
    conditionRows: unknown,
    parentId: string | null,
  ): EstimateConditionFormRow[] => {
    if (!Array.isArray(conditionRows)) {
      return [];
    }

    return conditionRows.map((conditionRow, conditionIndex) => {
      const condition = conditionRow as Record<string, unknown>;
      const id =
        typeof condition.id === "string" ? condition.id : crypto.randomUUID();
      return {
        id,
        name: typeof condition.name === "string" ? condition.name : "Condition",
        parent_condition_id:
          typeof condition.parent_condition_id === "string"
            ? condition.parent_condition_id
            : parentId,
        root_item_id:
          typeof condition.root_item_id === "string" ? condition.root_item_id : null,
        root_item_name:
          typeof condition.root_item_name === "string" ? condition.root_item_name : null,
        sort_order:
          typeof condition.sort_order === "number"
            ? condition.sort_order
            : conditionIndex + 1,
        complexity_factor_id:
          typeof condition.complexity_factor_id === "string"
            ? condition.complexity_factor_id
            : null,
        labor_phases_explicit: condition.labor_phases_explicit === true,
        included_labor_phases: mapLaborPhases(condition.included_labor_phases),
        specs: mapSpecs(condition.specs),
        conditions: mapTree(condition.conditions, id),
      };
    });
  };

  return mapTree(rows, null);
};

const mapSiteTree = (value: unknown): EstimateSiteTreeFormRow | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const tree = value as Record<string, unknown>;
  const mapZones = (rows: unknown): EstimateSiteScopeTreeFormRow["zones"] => {
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
            root_item_id:
              typeof scope.root_item_id === "string" ? scope.root_item_id : "",
            zones: mapZones(scope.zones),
          };
        })
      : [],
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

    return {
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      line_role: "standalone" as const,
      description: typeof item.description === "string" ? item.description : "",
      quantity: typeof item.quantity === "number" ? item.quantity : 0,
      qty_manual: item.qty_manual === true,
      unit: typeof item.unit === "string" ? item.unit : "ea",
      unit_cost: typeof item.unit_cost === "number" ? item.unit_cost : 0,
      unit_price: typeof item.unit_price === "number" ? item.unit_price : 0,
      unit_material: typeof item.unit_material === "number" ? item.unit_material : 0,
      unit_labor: typeof item.unit_labor === "number" ? item.unit_labor : 0,
      unit_freight: typeof item.unit_freight === "number" ? item.unit_freight : 0,
      unit_incidental: typeof item.unit_incidental === "number" ? item.unit_incidental : 0,
      unit_price_target:
        typeof item.unit_price_target === "number" ? item.unit_price_target : 0,
      parent_line_id: null,
      estimate_condition_id:
        typeof item.estimate_condition_id === "string"
          ? item.estimate_condition_id
          : "",
      allocations: Array.isArray(item.allocations)
        ? item.allocations.map((allocRow) => {
            const alloc = allocRow as Record<string, unknown>;
            return {
              site_zone_id:
                typeof alloc.site_zone_id === "string" ? alloc.site_zone_id : "",
              quantity: typeof alloc.quantity === "number" ? alloc.quantity : 1,
              site_zone_name:
                typeof alloc.site_zone_name === "string" ? alloc.site_zone_name : null,
            };
          })
        : [],
      lock:
        item.lock === "line" || item.lock === "sell" || item.lock === "none"
          ? item.lock
          : "none",
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
    conditions: mapConditions(data?.conditions),
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
      conditions: z.array(z.object({}).passthrough()).optional(),
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
      setValue("conditions", [], { shouldDirty: true });
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

      if (fieldAllows(activeManifest, "conditions", "write")) {
        const mapConditionPatch = (
          conditions: EstimateConditionFormRow[],
        ): unknown[] =>
          conditions.map((condition, conditionIndex) => ({
            id: condition.id,
            name: condition.name,
            parent_condition_id: condition.parent_condition_id,
            root_item_id: condition.root_item_id,
            sort_order: conditionIndex + 1,
            complexity_factor_id: condition.complexity_factor_id,
            labor_phases_explicit: condition.labor_phases_explicit,
            included_labor_phases: condition.included_labor_phases.map((phase) => ({
              labor_phase_id: phase.labor_phase_id,
            })),
            specs: condition.specs.map((spec) => estimateScopeSpecToPatchBody(spec)),
            conditions: mapConditionPatch(condition.conditions),
          }));

        body.conditions = mapConditionPatch(values.conditions ?? []);
      }

      if (fieldAllows(activeManifest, "line_items", "write")) {
        const orderedLines = orderLineItemsForPatch(
          values.conditions ?? [],
          (values.line_items ?? []).filter((row) => row.line_role === "standalone"),
        );

        body.line_items = orderedLines.map((row) => ({
          id: row.id,
          line_role: "standalone",
          description: row.description,
          quantity: row.quantity,
          qty_manual: row.qty_manual,
          unit: row.unit,
          unit_cost: row.unit_cost,
          unit_price: row.unit_price,
          parent_line_id: null,
          estimate_condition_id: row.estimate_condition_id,
          allocations: row.allocations.map((alloc) => ({
            site_zone_id: alloc.site_zone_id,
            quantity: alloc.quantity,
          })),
          lock: row.lock,
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
          Select a site to add conditions and line items.
        </Typography.Paragraph>
      ) : null}

      {fieldAllows(activeManifest, "stakeholders", "read") ? (
        <EstimateStakeholderFields manifest={activeManifest} />
      ) : null}
    </>
  );

  const lineItemsTab = showLineItemsTab ? (
    <EstimateLineItemsPanels
      key={siteId}
      manifest={activeManifest}
      siteId={siteId}
      siteSelected={Boolean(siteId)}
    />
  ) : null;

  const tabItems = [
    ...(fieldAllows(activeManifest, "profile", "read") ||
    fieldAllows(activeManifest, "stakeholders", "read")
      ? [{ key: "general", label: "General", children: generalTab }]
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
      disabled={saving || status === "sent" || status === "won"}
      form={form}
      defaultValues={defaultValues}
      resetKey={isCreate ? "create" : `${estimateId}:${detail?.data?.id ?? ""}`}
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout maxWidth={SURFACE_FORM_MAX_WIDTH}>
          <DetailHeader
            title={isCreate ? "New estimate" : (profile?.title ?? "Estimate")}
            items={tabItems.length > 0 ? tabItems : undefined}
          />
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
