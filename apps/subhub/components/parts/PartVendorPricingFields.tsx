"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { FieldControl } from "@latch/react";
import { Checkbox, Input, InputNumber, Skeleton, Typography } from "antd";
import { useMemo } from "react";
import {
  Controller,
  useFormContext,
  type FieldPath,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form";

import {
  FieldArrayTable,
  type FieldArrayTableColumn,
} from "@/components/form/FieldArrayTable";
import { FormSection } from "@/components/form/FormSection";
import { LinkedSelectControl } from "@/components/form/LinkedSelectInput";
import { findSelectLabel } from "@/components/form/optionHelpers";
import { useVendorPicker } from "@/lib/hooks/use-vendor-picker";
import { routes } from "@/lib/nav-routes";

export type VendorPricingFormRow = {
  id?: string;
  vendor_party_id: string;
  vendor_display_name?: string;
  vendor_pn: string;
  vendor_description: string;
  unit_price: number;
  is_preferred: boolean;
};

export type PartVendorPricingFormValues = {
  vendor_pricing: VendorPricingFormRow[];
};

type PartVendorPricingFieldsProps = {
  manifest: Manifest;
  canNavigateVendor: boolean;
};

type SelectOption = { value: string; label: string };

const vendorOptionsFromRows = (
  rows:
    | Array<{ id: string; summary?: { display_name?: string | null } }>
    | undefined,
  pricingRows: VendorPricingFormRow[],
): SelectOption[] => {
  const options =
    rows?.map((row) => ({
      value: row.id,
      label: row.summary?.display_name ?? row.id,
    })) ?? [];

  for (const row of pricingRows) {
    if (
      row.vendor_party_id &&
      row.vendor_display_name &&
      !options.some((option) => option.value === row.vendor_party_id)
    ) {
      options.push({
        value: row.vendor_party_id,
        label: row.vendor_display_name,
      });
    }
  }

  return options.sort((left, right) => left.label.localeCompare(right.label));
};

export const validateVendorPricingDuplicates = <T extends FieldValues>(
  rows: VendorPricingFormRow[],
  setError: UseFormSetError<T>,
): boolean => {
  const seen = new Map<string, number>();
  let valid = true;

  rows.forEach((row, index) => {
    if (!row.vendor_party_id || !row.vendor_pn) {
      return;
    }

    const key = `${row.vendor_party_id}:${row.vendor_pn}`;
    const priorIndex = seen.get(key);
    if (priorIndex !== undefined) {
      const message = "This vendor part number already exists on the part";
      setError(`vendor_pricing.${index}.vendor_pn` as FieldPath<T>, { message });
      setError(`vendor_pricing.${priorIndex}.vendor_pn` as FieldPath<T>, { message });
      valid = false;
    } else {
      seen.set(key, index);
    }
  });

  return valid;
};

const VendorCell = ({
  index,
  writable,
  disabled,
  options,
  loading,
  canNavigateVendor,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
  options: SelectOption[];
  loading: boolean;
  canNavigateVendor: boolean;
}) => {
  const { setValue, watch } = useFormContext<PartVendorPricingFormValues>();
  const vendorId = watch(`vendor_pricing.${index}.vendor_party_id`);

  return (
    <Controller<PartVendorPricingFormValues>
      name={`vendor_pricing.${index}.vendor_party_id`}
      render={({ field, fieldState }) => {
        if (loading) {
          return <Skeleton.Input active size="small" block />;
        }

        if (!writable) {
          return (
            <LinkedSelectControl
              mode="read"
              options={options}
              value={vendorId}
              canLink={canNavigateVendor}
              linkHref={routes.vendors.detail}
            />
          );
        }

        return (
          <LinkedSelectControl
            mode="write"
            options={options}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={(partyId) => {
              field.onChange(partyId);
              const label = findSelectLabel(options, partyId);
              setValue(`vendor_pricing.${index}.vendor_display_name`, label ?? "", {
                shouldDirty: true,
              });
            }}
            onBlur={field.onBlur}
            disabled={disabled}
            loading={loading}
            status={fieldState.error ? "error" : undefined}
            canLink={canNavigateVendor}
            linkHref={routes.vendors.detail}
            placeholder="Select vendor"
          />
        );
      }}
    />
  );
};

const TextCell = ({
  name,
  writable,
  disabled,
  loading,
  placeholder,
}: {
  name: FieldPath<PartVendorPricingFormValues>;
  writable: boolean;
  disabled: boolean;
  loading: boolean;
  placeholder?: string;
}) => {
  const { control } = useFormContext<PartVendorPricingFormValues>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        if (loading) {
          return <Skeleton.Input active size="small" block />;
        }

        if (!writable) {
          return <Typography.Text>{String(field.value ?? "—")}</Typography.Text>;
        }

        return (
          <Input
            {...field}
            value={typeof field.value === "string" ? field.value : String(field.value ?? "")}
            disabled={disabled}
            placeholder={placeholder}
            status={fieldState.error ? "error" : undefined}
          />
        );
      }}
    />
  );
};

const UnitPriceCell = ({
  index,
  writable,
  disabled,
  loading,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
  loading: boolean;
}) => {
  const { control } = useFormContext<PartVendorPricingFormValues>();

  return (
    <Controller
      control={control}
      name={`vendor_pricing.${index}.unit_price`}
      render={({ field, fieldState }) => {
        if (loading) {
          return <Skeleton.Input active size="small" block />;
        }

        if (!writable) {
          return (
            <Typography.Text>
              {typeof field.value === "number" ? field.value.toFixed(2) : "—"}
            </Typography.Text>
          );
        }

        return (
          <InputNumber
            value={field.value ?? null}
            onChange={field.onChange}
            onBlur={field.onBlur}
            disabled={disabled}
            min={0}
            precision={2}
            style={{ width: "100%" }}
            status={fieldState.error ? "error" : undefined}
          />
        );
      }}
    />
  );
};

const PreferredCell = ({
  index,
  writable,
  disabled,
  loading,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
  loading: boolean;
}) => {
  const { control, getValues, setValue } = useFormContext<PartVendorPricingFormValues>();

  return (
    <Controller
      control={control}
      name={`vendor_pricing.${index}.is_preferred`}
      render={({ field }) => {
        if (loading) {
          return <Skeleton.Button active size="small" />;
        }

        if (!writable) {
          return <Typography.Text>{field.value ? "Yes" : "No"}</Typography.Text>;
        }

        return (
          <Checkbox
            checked={Boolean(field.value)}
            disabled={disabled}
            onChange={(event) => {
              const checked = event.target.checked;
              if (checked) {
                const rows = getValues("vendor_pricing") ?? [];
                rows.forEach((_, rowIndex) => {
                  setValue(`vendor_pricing.${rowIndex}.is_preferred`, rowIndex === index, {
                    shouldDirty: true,
                  });
                });
                return;
              }

              field.onChange(false);
            }}
          />
        );
      }}
    />
  );
};

export const PartVendorPricingFields = ({
  manifest,
  canNavigateVendor,
}: PartVendorPricingFieldsProps) => {
  const { watch } = useFormContext<PartVendorPricingFormValues>();
  const pricingRows = watch("vendor_pricing") ?? [];

  const { data: vendorPicker, isLoading: vendorPickerLoading } = useVendorPicker();

  const vendorOptions = useMemo(
    () => vendorOptionsFromRows(vendorPicker?.data.rows, pricingRows),
    [pricingRows, vendorPicker?.data.rows],
  );

  const writable = fieldAllows(manifest, "vendor_pricing", "write");
  const pickerLoading = vendorPickerLoading;

  const columns = useMemo<
    FieldArrayTableColumn<PartVendorPricingFormValues, "vendor_pricing">[]
  >(
    () => [
      {
        key: "vendor",
        title: "Vendor",
        width: "22%",
        render: ({ index, writable: rowWritable, disabled, loading }) => (
          <VendorCell
            index={index}
            writable={rowWritable}
            disabled={disabled}
            options={vendorOptions}
            loading={loading || pickerLoading}
            canNavigateVendor={canNavigateVendor}
          />
        ),
      },
      {
        key: "vendor_pn",
        title: "Vendor PN",
        width: "16%",
        render: ({ index, writable: rowWritable, disabled, loading }) => (
          <TextCell
            name={`vendor_pricing.${index}.vendor_pn`}
            writable={rowWritable}
            disabled={disabled}
            loading={loading}
            placeholder="SKU"
          />
        ),
      },
      {
        key: "vendor_description",
        title: "Description",
        render: ({ index, writable: rowWritable, disabled, loading }) => (
          <TextCell
            name={`vendor_pricing.${index}.vendor_description`}
            writable={rowWritable}
            disabled={disabled}
            loading={loading}
          />
        ),
      },
      {
        key: "unit_price",
        title: "Unit price",
        width: 120,
        render: ({ index, writable: rowWritable, disabled, loading }) => (
          <UnitPriceCell
            index={index}
            writable={rowWritable}
            disabled={disabled}
            loading={loading}
          />
        ),
      },
      {
        key: "is_preferred",
        title: "Preferred",
        width: 96,
        render: ({ index, writable: rowWritable, disabled, loading }) => (
          <PreferredCell
            index={index}
            writable={rowWritable}
            disabled={disabled}
            loading={loading}
          />
        ),
      },
    ],
    [canNavigateVendor, pickerLoading, vendorOptions],
  );

  const emptyState =
    pricingRows.length === 0 ? (
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        No vendor pricing
      </Typography.Paragraph>
    ) : null;

  return (
    <FieldControl manifest={manifest} field="vendor_pricing">
      <FormSection title="Vendor pricing">
        {emptyState}
        <FieldArrayTable<PartVendorPricingFormValues, "vendor_pricing">
          field="vendor_pricing"
          name="vendor_pricing"
          columns={columns}
          createRow={() => ({
            vendor_party_id: "",
            vendor_display_name: "",
            vendor_pn: "",
            vendor_description: "",
            unit_price: 0,
            is_preferred: false,
          })}
          addLabel="Add vendor price"
          allowAdd={writable}
        />
      </FormSection>
    </FieldControl>
  );
};
