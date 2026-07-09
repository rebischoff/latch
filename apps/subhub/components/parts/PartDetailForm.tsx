"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { App, Tabs, Typography } from "antd";
import { notFound, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { FormSection } from "@/components/form/FormSection";
import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import { InputNumberInput } from "@/components/form/InputNumberInput";
import { LinkedSelectInput } from "@/components/form/LinkedSelectInput";
import { TextAreaInput } from "@/components/form/TextAreaInput";
import { TextInput } from "@/components/form/TextInput";
import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import {
  PartItemLinksField,
  validateItemLinkDuplicates,
  type ItemLinkFormRow,
} from "@/components/parts/PartItemLinksField";
import {
  PartSpecsField,
  type PartSpecFormRow,
} from "@/components/parts/PartSpecsField";
import {
  collapsePartSpecRows,
  expandPartSpecsForPatch,
  partSpecsToDisplayUnits,
} from "@/lib/parts/part-specs-form";
import {
  PartVendorPricingFields,
  validateVendorPricingDuplicates,
  type VendorPricingFormRow,
} from "@/components/parts/PartVendorPricingFields";
import { useApplyPickerReturn } from "@/lib/hooks/use-apply-picker-return";
import { useManufacturerPicker } from "@/lib/hooks/use-manufacturer-picker";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import {
  PartDetailCreateSchema,
  PartDetailPatchSchema,
} from "@/lib/parts/descriptors/part-detail";
import { routes } from "@/lib/nav-routes";
import { buildPickerCreateUrl, parseReturnContext } from "@/lib/picker-return-context";
import {
  navigateAfterCreate,
  navigateOnCancel,
  sanitizeReturnTo,
} from "@/lib/surface-navigation";
import { SurfaceApiError } from "@/lib/surface-api";

type PartDetailFormProps = {
  partId: string;
  manifest: Manifest;
  canNavigateManufacturer: boolean;
  canNavigateVendor: boolean;
  canCreateManufacturer: boolean;
};

type PartDetailFormValues = {
  profile: {
    manufacturer_party_id: string;
    mpn: string;
    description: string;
    unit?: string;
    purchase_unit?: string | null;
    units_per_purchase?: number;
  };
  vendor_pricing: VendorPricingFormRow[];
  item_links: ItemLinkFormRow[];
  part_specs: PartSpecFormRow[];
};

const mapItemLinks = (rows: unknown): ItemLinkFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      item_id: typeof item.item_id === "string" ? item.item_id : "",
      name: typeof item.name === "string" ? item.name : "",
      breadcrumb: typeof item.breadcrumb === "string" ? item.breadcrumb : "",
      sort_order: typeof item.sort_order === "number" ? item.sort_order : undefined,
    };
  });
};

const mapPartSpecs = (rows: unknown): PartSpecFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const flat: PartSpecFormRow[] = rows.map((row) => {
    const item = row as Record<string, unknown>;
    const valueType =
      item.value_type === "enum" ||
      item.value_type === "boolean" ||
      item.value_type === "number"
        ? item.value_type
        : undefined;

    return {
      spec_def_id: typeof item.spec_def_id === "string" ? item.spec_def_id : "",
      code: typeof item.code === "string" ? item.code : "",
      display_name: typeof item.display_name === "string" ? item.display_name : "",
      value_type: valueType,
      spec_option_ids:
        typeof item.spec_option_id === "string" ? [item.spec_option_id] : undefined,
      value_number: typeof item.value_number === "number" ? item.value_number : null,
      value_number_max:
        typeof item.value_number_max === "number" ? item.value_number_max : null,
      value_boolean:
        typeof item.value_boolean === "boolean" ? item.value_boolean : null,
      unit_symbol: typeof item.unit_symbol === "string" ? item.unit_symbol : null,
      to_canonical_factor:
        typeof item.to_canonical_factor === "number" ? item.to_canonical_factor : undefined,
      decimal_places:
        typeof item.decimal_places === "number" ? item.decimal_places : null,
    };
  });

  return partSpecsToDisplayUnits(collapsePartSpecRows(flat));
};

const mapVendorPricing = (rows: unknown): VendorPricingFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: typeof item.id === "string" ? item.id : undefined,
      vendor_party_id: typeof item.vendor_party_id === "string" ? item.vendor_party_id : "",
      vendor_display_name:
        typeof item.vendor_display_name === "string" ? item.vendor_display_name : "",
      vendor_pn: typeof item.vendor_pn === "string" ? item.vendor_pn : "",
      vendor_description:
        typeof item.vendor_description === "string" ? item.vendor_description : "",
      unit_price: typeof item.unit_price === "number" ? item.unit_price : 0,
      is_preferred: Boolean(item.is_preferred),
    };
  });
};

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
  isCreate: boolean,
): PartDetailFormValues => {
  if (isCreate) {
    return {
      profile: {
        manufacturer_party_id: "",
        mpn: "",
        description: "",
        unit: "ea",
        purchase_unit: null,
        units_per_purchase: 1,
      },
      vendor_pricing: [],
      item_links: [],
      part_specs: [],
    };
  }

  const profile = data?.profile as
    | {
        manufacturer_party_id?: string | null;
        mpn?: string | null;
        description?: string | null;
        unit?: string | null;
        purchase_unit?: string | null;
        units_per_purchase?: number | null;
      }
    | undefined;

  return {
    profile: {
      manufacturer_party_id: profile?.manufacturer_party_id ?? "",
      mpn: profile?.mpn ?? "",
      description: profile?.description ?? "",
      unit: profile?.unit ?? "ea",
      purchase_unit: profile?.purchase_unit ?? null,
      units_per_purchase: profile?.units_per_purchase ?? 1,
    },
    vendor_pricing: mapVendorPricing(data?.vendor_pricing),
    item_links: mapItemLinks(data?.item_links),
    part_specs: mapPartSpecs(data?.part_specs),
  };
};

const manufacturerPickerOptions = (
  rows:
    | Array<{ id: string; summary?: { display_name?: string | null } }>
    | undefined,
): Array<{ value: string; label: string }> =>
  rows?.map((row) => ({
    value: row.id,
    label: row.summary?.display_name ?? row.id,
  })) ?? [];

const normalizeProfileBody = (
  profile: PartDetailFormValues["profile"],
): Record<string, unknown> => ({
  manufacturer_party_id: profile.manufacturer_party_id,
  mpn: profile.mpn,
  description: profile.description,
  unit: profile.unit,
  purchase_unit:
    profile.purchase_unit === "" || profile.purchase_unit === undefined
      ? null
      : profile.purchase_unit,
  units_per_purchase: profile.units_per_purchase,
});

const normalizeItemLinksBody = (
  rows: ItemLinkFormRow[],
): Array<Record<string, unknown>> =>
  rows
    .filter((row) => Boolean(row.item_id))
    .map((row, index) => ({
      item_id: row.item_id,
      sort_order: row.sort_order ?? index + 1,
    }));

const normalizePartSpecsBody = (
  rows: PartSpecFormRow[],
): Array<Record<string, unknown>> => expandPartSpecsForPatch(rows);

const normalizeVendorPricingBody = (
  rows: VendorPricingFormRow[],
): Array<Record<string, unknown>> =>
  rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    vendor_party_id: row.vendor_party_id,
    vendor_pn: row.vendor_pn,
    vendor_description: row.vendor_description,
    unit_price: row.unit_price,
    is_preferred: row.is_preferred,
  }));

export const PartDetailForm = ({
  partId,
  manifest,
  canNavigateManufacturer,
  canNavigateVendor,
  canCreateManufacturer,
}: PartDetailFormProps) => {
  const isCreate = partId === "new";
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
    "part_detail",
    isCreate ? undefined : partId,
  );
  const { data: manufacturerPicker, isLoading: manufacturerPickerLoading } =
    useManufacturerPicker();
  const patch = useSurfacePatch("part_detail", partId);
  const create = useSurfaceListCreate("part_list", "part_detail");
  const remove = useSurfaceDelete("part_detail", partId);

  const activeManifest = detail?.manifest ?? manifest;
  const profile = detail?.data.profile as
    | {
        mpn?: string | null;
        manufacturer_party_id?: string | null;
        manufacturer_display_name?: string | null;
      }
    | undefined;

  const defaultValues = useMemo(() => {
    const base = isCreate
      ? buildDefaultValues(undefined, true)
      : buildDefaultValues(detail?.data, false);
    const pickedId = persistedPickerSelectedIdRef.current;
    if (isCreate && pickedId) {
      return {
        ...base,
        profile: {
          ...base.profile,
          manufacturer_party_id: pickedId,
        },
      };
    }
    return base;
  }, [detail?.data, isCreate, pickerReturn.selectedId]);

  const partSpecsSyncKey = useMemo(() => {
    if (isCreate) {
      return "create";
    }
    if (!detail?.data) {
      return `${partId}:loading`;
    }
    const links = mapItemLinks(detail.data.item_links);
    const specs = mapPartSpecs(detail.data.part_specs);
    const linkIds = links
      .map((row) => row.item_id)
      .filter(Boolean)
      .sort()
      .join(",");
    const specIds = specs
      .map((row) => row.spec_def_id)
      .filter(Boolean)
      .sort()
      .join(",");
    const dataId =
      typeof detail.data.id === "string" ? detail.data.id : String(detail.data.id ?? "");
    return `${partId}:${dataId}:${linkIds}:${specIds}`;
  }, [detail?.data, isCreate, partId]);

  const resolver = useMemo(() => {
    const baseSchema = (isCreate ? PartDetailCreateSchema : PartDetailPatchSchema) as z.ZodObject<
      z.ZodRawShape
    >;
    const narrowed = narrowPatchSchema(baseSchema, activeManifest) as z.ZodObject<z.ZodRawShape>;
    const loosened = narrowed.extend({
      vendor_pricing: z.array(z.object({}).passthrough()).optional(),
      item_links: z.array(z.object({}).passthrough()).optional(),
      part_specs: z.array(z.object({}).passthrough()).optional(),
    });

    return zodResolver(loosened);
  }, [activeManifest, isCreate]);

  const form = useForm<PartDetailFormValues>({
    resolver: resolver as unknown as Resolver<PartDetailFormValues>,
    defaultValues,
  });

  const { setValue, watch } = form;

  useApplyPickerReturn({
    setValue,
    returnField: "profile.manufacturer_party_id",
  });

  const manufacturerId = watch("profile.manufacturer_party_id");

  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const manufacturerCreateUrl = useMemo(
    () =>
      buildPickerCreateUrl({
        target: "manufacturer",
        returnTo,
        returnField: "profile.manufacturer_party_id",
      }),
    [returnTo],
  );

  const manufacturerOptions = useMemo(() => {
    const options = manufacturerPickerOptions(manufacturerPicker?.data.rows);
    const currentId = manufacturerId || profile?.manufacturer_party_id;
    const currentName =
      profile?.manufacturer_display_name ??
      options.find((option) => option.value === currentId)?.label;
    if (
      currentId &&
      currentName &&
      !options.some((option) => option.value === currentId)
    ) {
      return [...options, { value: currentId, label: currentName }];
    }
    return options;
  }, [
    manufacturerPicker?.data.rows,
    manufacturerId,
    profile?.manufacturer_display_name,
    profile?.manufacturer_party_id,
  ]);

  const {
    formState: { isDirty },
  } = form;

  const unit = watch("profile.unit") ?? "ea";
  const purchaseUnit = watch("profile.purchase_unit");
  const unitsPerPurchase = watch("profile.units_per_purchase") ?? 1;
  const showUomHint =
    Boolean(purchaseUnit) && purchaseUnit !== unit && purchaseUnit !== "";

  const canSave = patchableFieldIds(activeManifest).length > 0;
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");
  const saving = patch.isPending || create.isPending;
  const showAddManufacturer =
    canCreateManufacturer && fieldAllows(activeManifest, "profile", "write");

  const persistPart = useCallback(
    async (values: PartDetailFormValues, afterCreate: "detail" | "reset") => {
      const pricingRows = values.vendor_pricing ?? [];
      const itemLinkRows = values.item_links ?? [];
      const partSpecRows = values.part_specs ?? [];

      if (
        fieldAllows(activeManifest, "vendor_pricing", "write") &&
        !validateVendorPricingDuplicates(pricingRows, form.setError)
      ) {
        message.error("Fix duplicate vendor pricing before saving");
        return;
      }

      if (
        fieldAllows(activeManifest, "item_links", "write") &&
        !validateItemLinkDuplicates(itemLinkRows, form.setError)
      ) {
        message.error("Fix duplicate item links before saving");
        return;
      }

      const body: Record<string, unknown> = {
        profile: normalizeProfileBody(values.profile),
      };

      if (fieldAllows(activeManifest, "vendor_pricing", "write")) {
        body.vendor_pricing = normalizeVendorPricingBody(pricingRows);
      }

      if (fieldAllows(activeManifest, "item_links", "write")) {
        body.item_links = normalizeItemLinksBody(itemLinkRows);
      }

      if (fieldAllows(activeManifest, "part_specs", "write")) {
        body.part_specs = normalizePartSpecsBody(partSpecRows);
      }

      try {
        if (isCreate) {
          const result = await create.mutateAsync(body);
          const newId = String(result.data.id);
          message.success("Part created");

          if (afterCreate === "reset") {
            form.reset(buildDefaultValues(undefined, true));
            return;
          }

          if (pickerReturn.returnField && returnTo) {
            navigateAfterCreate(router, {
              returnTo: sanitizeReturnTo(returnTo, routes.parts.list),
              returnField: pickerReturn.returnField,
              newId,
              fallbackList: routes.parts.list,
              fallbackDetail: routes.parts.detail,
            });
            return;
          }

          router.replace(routes.parts.detail(newId));
          router.refresh();
          return;
        }

        await patch.mutateAsync(body);
        message.success("Part saved");
      } catch (saveError) {
        if (saveError instanceof SurfaceApiError) {
          if (saveError.status === 409) {
            message.error(saveError.message || "MPN already exists for this manufacturer");
            return;
          }

          const details = saveError.details as
            | {
                field?: string;
                code?: string;
                vendor_party_id?: string;
                vendor_pn?: string;
              }
            | undefined;

          if (details?.field === "vendor_pricing" && details.code === "duplicate") {
            pricingRows.forEach((row, index) => {
              if (
                row.vendor_party_id === details.vendor_party_id &&
                row.vendor_pn === details.vendor_pn
              ) {
                form.setError(`vendor_pricing.${index}.vendor_pn`, {
                  message: "This vendor part number already exists on the part",
                });
              }
            });
            message.error("Fix duplicate vendor pricing before saving");
            return;
          }

          if (details?.field === "vendor_pricing" && details.code === "duplicate_vendor_pn") {
            pricingRows.forEach((row, index) => {
              if (
                row.vendor_party_id === details.vendor_party_id &&
                row.vendor_pn === details.vendor_pn
              ) {
                form.setError(`vendor_pricing.${index}.vendor_pn`, {
                  message: "Vendor part number already exists for this vendor",
                });
              }
            });
            message.error(saveError.message || "Vendor part number already exists");
            return;
          }
        }

        message.error(isCreate ? "Unable to create part" : "Unable to save part");
      }
    },
    [activeManifest, create, form, isCreate, message, patch, pickerReturn.returnField, returnTo, router],
  );

  const onSave = form.handleSubmit((values) => persistPart(values, "detail"));

  const onSaveAndNew = useMemo(
    () =>
      isCreate && !pickerReturn.returnField
        ? form.handleSubmit((values) => persistPart(values, "reset"))
        : undefined,
    [form, isCreate, persistPart, pickerReturn.returnField],
  );

  const onCancel = useCallback(() => {
    const navigate = () => {
      navigateOnCancel(router, returnTo, routes.parts.list);
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
      title: "Delete part?",
      content: "This permanently removes the part and its vendor pricing.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await remove.mutateAsync();
          message.success("Part deleted");
          router.push(routes.parts.list);
          router.refresh();
        } catch (deleteError) {
          if (deleteError instanceof SurfaceApiError && deleteError.status === 409) {
            message.error(deleteError.message || "Part is in use and cannot be deleted");
            return;
          }

          message.error("Unable to delete part");
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

  const showPurchaseTab =
    fieldAllows(activeManifest, "profile", "read") ||
    fieldAllows(activeManifest, "vendor_pricing", "read");
  const showSpecsTab =
    fieldAllows(activeManifest, "item_links", "read") ||
    fieldAllows(activeManifest, "part_specs", "read");
  const activeTab =
    searchParams.get("tab") === "specs" && showSpecsTab ? "specs" : "purchase";

  const purchaseContent = (
    <>
      {fieldAllows(activeManifest, "profile", "read") ? (
        <FormSection title="Profile">
          <LinkedSelectInput<PartDetailFormValues>
            field="profile"
            name="profile.manufacturer_party_id"
            label="Manufacturer"
            options={manufacturerOptions}
            loading={manufacturerPickerLoading}
            canLink={canNavigateManufacturer}
            linkHref={routes.manufacturers.detail}
            canAddNew={showAddManufacturer}
            addNewHref={manufacturerCreateUrl}
            addNewLabel="Add manufacturer"
            selectProps={{
              showSearch: true,
              optionFilterProp: "label",
            }}
          />
          <TextInput<PartDetailFormValues>
            field="profile"
            name="profile.mpn"
            label="MPN"
          />
          <TextAreaInput<PartDetailFormValues>
            field="profile"
            name="profile.description"
            label="Description"
          />
          <TextInput<PartDetailFormValues>
            field="profile"
            name="profile.unit"
            label="Unit"
          />
          <TextInput<PartDetailFormValues>
            field="profile"
            name="profile.purchase_unit"
            label="Purchase unit"
          />
          <InputNumberInput<PartDetailFormValues>
            field="profile"
            name="profile.units_per_purchase"
            label="Units per purchase"
            min={1}
          />
        </FormSection>
      ) : null}

      {showUomHint ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Price is per {purchaseUnit}. 1 {purchaseUnit} = {unitsPerPurchase} {unit}.
        </Typography.Paragraph>
      ) : null}

      {fieldAllows(activeManifest, "vendor_pricing", "read") ? (
        <PartVendorPricingFields
          manifest={activeManifest}
          canNavigateVendor={canNavigateVendor}
        />
      ) : null}
    </>
  );

  const specsContent = (
    <>
      {fieldAllows(activeManifest, "item_links", "read") ? (
        <PartItemLinksField manifest={activeManifest} />
      ) : null}

      {fieldAllows(activeManifest, "part_specs", "read") ? (
        <PartSpecsField manifest={activeManifest} syncKey={partSpecsSyncKey} />
      ) : null}
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
      resetKey={isCreate ? "create" : `${partId}:${detail?.data?.id ?? ""}`}
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout maxWidth={SURFACE_FORM_MAX_WIDTH}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {isCreate ? "New part" : (profile?.mpn ?? "Part")}
          </Typography.Title>

          {showPurchaseTab && showSpecsTab ? (
            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                const params = new URLSearchParams(searchParams.toString());
                if (key === "specs") {
                  params.set("tab", "specs");
                } else {
                  params.delete("tab");
                }
                const query = params.toString();
                router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
              }}
              items={[
                { key: "purchase", label: "Purchase", children: purchaseContent },
                { key: "specs", label: "Specs", children: specsContent },
              ]}
            />
          ) : showPurchaseTab ? (
            purchaseContent
          ) : (
            specsContent
          )}
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
