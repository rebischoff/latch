"use client";

import { InputNumber, Popover, Typography } from "antd";
import { useState } from "react";

import type { SpecUnitDisplayMeta } from "@/lib/catalog/spec-units";

export type SpecNumberValuePopoverProps = {
  disabled?: boolean;
  emptyLabel: string;
  maxStatus?: "error" | undefined;
  minLabel?: string;
  minStatus?: "error" | undefined;
  onMaxChange: (value: number | null) => void;
  onMinChange: (value: number | null) => void;
  readOnly?: boolean;
  readOnlyEmptyLabel?: string;
  title?: string;
  unitMeta: SpecUnitDisplayMeta;
  valueMax: number | null;
  valueMin: number | null;
};

const formatNumberDisplay = (
  value: number | null | undefined,
  unitMeta: SpecUnitDisplayMeta,
): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  const formatted =
    unitMeta.decimal_places != null
      ? value.toFixed(unitMeta.decimal_places)
      : String(value);

  return unitMeta.unit_symbol ? `${formatted} ${unitMeta.unit_symbol}` : formatted;
};

const formatNumberValueSummary = (
  valueMin: number | null,
  valueMax: number | null,
  unitMeta: SpecUnitDisplayMeta,
  emptyLabel: string,
): string => {
  const hasMin = valueMin !== null && valueMin !== undefined;
  const hasMax = valueMax !== null && valueMax !== undefined;

  if (!hasMin && !hasMax) {
    return emptyLabel;
  }

  if (hasMax) {
    const min = formatNumberDisplay(valueMin, unitMeta);
    const max = formatNumberDisplay(valueMax, unitMeta);
    if (min === "—" && max === "—") {
      return emptyLabel;
    }
    return `${min} – ${max}`;
  }

  return formatNumberDisplay(valueMin, unitMeta);
};

export const SpecNumberValuePopover = ({
  disabled = false,
  emptyLabel,
  maxStatus,
  minLabel = "Min / exact",
  minStatus,
  onMaxChange,
  onMinChange,
  readOnly = false,
  readOnlyEmptyLabel,
  title = "Number filter",
  unitMeta,
  valueMax,
  valueMin,
}: SpecNumberValuePopoverProps) => {
  const [open, setOpen] = useState(false);
  const summary = formatNumberValueSummary(valueMin, valueMax, unitMeta, emptyLabel);
  const isEmpty = summary === emptyLabel;
  const readOnlyLabel = isEmpty ? (readOnlyEmptyLabel ?? emptyLabel) : summary;

  if (readOnly) {
    return (
      <Typography.Text type={isEmpty ? "secondary" : undefined}>{readOnlyLabel}</Typography.Text>
    );
  }

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 240 }}>
      <div>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          {minLabel}
        </Typography.Text>
        <InputNumber
          addonAfter={unitMeta.unit_symbol ?? undefined}
          disabled={disabled}
          placeholder="Min / exact"
          precision={unitMeta.decimal_places ?? undefined}
          status={minStatus}
          style={{ width: "100%" }}
          value={valueMin}
          onChange={(value) => onMinChange(value ?? null)}
        />
      </div>
      <div>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          Max (optional)
        </Typography.Text>
        <InputNumber
          addonAfter={unitMeta.unit_symbol ?? undefined}
          disabled={disabled}
          placeholder="Empty = exact"
          precision={unitMeta.decimal_places ?? undefined}
          status={maxStatus}
          style={{ width: "100%" }}
          value={valueMax}
          onChange={(value) => onMaxChange(value ?? null)}
        />
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      title={title}
    >
      <Typography.Link disabled={disabled && isEmpty}>{summary}</Typography.Link>
    </Popover>
  );
};
