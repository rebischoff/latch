"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { Select, Typography } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { FormFieldItem } from "@/components/form/FormFieldItem";
import { FormSection } from "@/components/form/FormSection";
import { useFormUi } from "@/components/surface/useFormUi";

import type { ItemDetailFormValues } from "./ItemDetailForm";

type ItemSpecParticipationFieldProps = {
  detailReady: boolean;
  isCreate: boolean;
  manifest: Manifest;
  serverNodeType?: "scope" | "category" | "item";
};

const filterSpecOption = (input: string, option?: DefaultOptionType): boolean => {
  const label = typeof option?.label === "string" ? option.label : "";
  return label.toLowerCase().includes(input.toLowerCase());
};

export const ItemSpecParticipationField = ({
  isCreate,
  manifest,
  detailReady,
  serverNodeType,
}: ItemSpecParticipationFieldProps) => {
  const { setValue, getValues } = useFormContext<ItemDetailFormValues>();
  const { disabled: formDisabled } = useFormUi();
  const nodeType = useWatch({ name: "profile.node_type", defaultValue: "category" as const });
  const participates =
    useWatch<ItemDetailFormValues, "spec_participation.participates">({
      name: "spec_participation.participates",
      defaultValue: [],
    }) ?? [];
  const canRead = fieldAllows(manifest, "spec_participation", "read");
  const canWrite = fieldAllows(manifest, "spec_participation", "write");

  const isQuotableLeaf =
    nodeType === "item" || (!isCreate && detailReady && serverNodeType === "item");

  const options = useMemo(
    () =>
      participates.map((row) => ({
        value: row.spec_def_id,
        label: row.display_name,
      })),
    [participates],
  );

  const activeIds = useMemo(
    () => participates.filter((row) => row.active).map((row) => row.spec_def_id),
    [participates],
  );

  if (!canRead || isCreate || !isQuotableLeaf) {
    return null;
  }

  const onChange = (selectedIds: string[]) => {
    const currentRows = getValues("spec_participation.participates") ?? [];
    const selected = new Set(selectedIds ?? []);
    setValue(
      "spec_participation.participates",
      currentRows.map((row) => ({
        ...row,
        active: selected.has(row.spec_def_id),
      })),
      { shouldDirty: true, shouldTouch: true },
    );
  };

  return (
    <FormSection title="Specs">
      {participates.length === 0 ? (
        <Typography.Text type="secondary">
          No specs defined for this scope yet.
        </Typography.Text>
      ) : (
        <FormFieldItem label="Specs">
          <Select
            mode="multiple"
            allowClear
            disabled={!canWrite || formDisabled}
            filterOption={filterSpecOption}
            options={options}
            optionFilterProp="label"
            showSearch
            value={activeIds}
            onChange={onChange}
            placeholder="Select specs"
            style={{ width: "100%" }}
          />
        </FormFieldItem>
      )}
    </FormSection>
  );
};
