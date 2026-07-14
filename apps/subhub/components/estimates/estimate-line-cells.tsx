"use client";

import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { Button, Input, InputNumber, Select, TreeSelect, Typography } from "antd";
import type { TreeSelectProps } from "antd";
import {
  Controller,
  useFormContext,
  useWatch,
  type FieldPath,
} from "react-hook-form";

import type {
  EstimateConditionFormRow,
  EstimateLineEditorFormValues,
  EstimateLineFormRow,
} from "@/components/estimates/estimate-line-tree";
import { rootItemIdForCondition } from "@/components/estimates/estimate-line-tree";
import {
  useEstimateItemPicker,
  useEstimatePartPicker,
  type ItemTreeNode,
} from "@/lib/hooks/use-estimate-item-picker";
import { buildConditionDraft } from "@/lib/estimates/condition-draft";

export const LINE_TABLE_COLUMN_WIDTHS = {
  item_id: 280,
  part_id: 130,
  quantity: 90,
  unit: 80,
  unit_material: 100,
  unit_freight: 90,
  unit_incidental: 90,
  unit_labor: 90,
  unit_price_target: 100,
  unit_cost: 110,
  material_lock: 36,
  sales_lock: 36,
  unit_price: 100,
  ext_sell: 100,
  actions: 48,
} as const;

export const lineTableScrollX = (includeActions: boolean): number => {
  const { actions, ...rest } = LINE_TABLE_COLUMN_WIDTHS;
  const base = Object.values(rest).reduce((sum, width) => sum + width, 0);
  return includeActions ? base + actions : base;
};

export const lineFieldPath = (
  index: number,
  key: keyof EstimateLineFormRow,
): FieldPath<EstimateLineEditorFormValues> =>
  `line_items.${index}.${key}` as FieldPath<EstimateLineEditorFormValues>;

const toAntdItemTree = (nodes: ItemTreeNode[]): TreeSelectProps["treeData"] =>
  nodes.map((node) => ({
    value: node.value,
    title: node.label,
    selectable: node.selectable,
    children: node.children ? toAntdItemTree(node.children) : undefined,
  }));

type CellProps = {
  index: number;
  writable: boolean;
  disabled: boolean;
};

type PreviewAwareCellProps = CellProps & {
  onPreview?: (index: number) => void;
  previewing?: boolean;
};

export const ItemCell = ({
  index,
  writable,
  disabled,
  conditions,
  onPreview,
}: PreviewAwareCellProps & { conditions: EstimateConditionFormRow[] }) => {
  const estimateConditionId = useWatch({
    name: lineFieldPath(index, "estimate_condition_id"),
  }) as string | undefined;
  const materialLocked = useWatch({
    name: lineFieldPath(index, "material_locked"),
  }) as boolean | undefined;
  const rootItemId = estimateConditionId
    ? rootItemIdForCondition(estimateConditionId, conditions)
    : null;
  const { data: itemTree, isLoading } = useEstimateItemPicker(
    rootItemId,
    Boolean(rootItemId),
  );

  return (
    <Controller<EstimateLineEditorFormValues>
      name={lineFieldPath(index, "item_id")}
      render={({ field: { value, onChange } }) =>
        writable ? (
          <TreeSelect
            size="small"
            style={{ width: "100%" }}
            loading={isLoading}
            treeData={toAntdItemTree(itemTree ?? [])}
            value={value ?? undefined}
            disabled={disabled || !rootItemId || Boolean(materialLocked)}
            placeholder={
              materialLocked
                ? "Material locked"
                : rootItemId
                  ? "Select item"
                  : "Condition required"
            }
            onChange={(next) => {
              const raw = typeof next === "string" ? next : null;
              onChange(raw);
              onPreview?.(index);
            }}
            treeDefaultExpandAll
          />
        ) : (
          <Typography.Text>{String(value ?? "—")}</Typography.Text>
        )
      }
    />
  );
};

export const PartCell = ({
  index,
  writable,
  disabled,
  onPreview,
}: PreviewAwareCellProps) => {
  const itemId = useWatch({ name: lineFieldPath(index, "item_id") }) as string | null;
  const estimateConditionId = useWatch({
    name: lineFieldPath(index, "estimate_condition_id"),
  }) as string | undefined;
  const conditions = (useWatch({ name: "conditions" }) ??
    []) as EstimateConditionFormRow[];
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();

  const draft = estimateConditionId
    ? buildConditionDraft(conditions, estimateConditionId)
    : undefined;

  const materialLocked = useWatch({
    name: lineFieldPath(index, "material_locked"),
  }) as boolean | undefined;

  const { data: parts, isLoading } = useEstimatePartPicker(
    itemId,
    estimateConditionId ?? null,
    Boolean(itemId && estimateConditionId),
    draft,
  );

  if (!itemId) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  const options = (parts ?? []).map((part) => ({
    value: part.id,
    label: part.mpn,
  }));
  const empty = !isLoading && options.length === 0;

  return (
    <Controller<EstimateLineEditorFormValues>
      name={lineFieldPath(index, "part_id")}
      render={({ field: { value, onChange } }) =>
        writable ? (
          <Select
            size="small"
            style={{ width: "100%" }}
            allowClear
            loading={isLoading}
            placeholder={empty ? "No match" : "Pick PN"}
            value={value ?? undefined}
            disabled={disabled || Boolean(materialLocked)}
            options={options}
            onChange={(next) => {
              onChange(next ?? null);
              // Clear leaves material_locked as-is; estimator unlocks via lock control.
              if (next) {
                setValue(lineFieldPath(index, "material_locked"), true, {
                  shouldDirty: true,
                });
              }
              onPreview?.(index);
            }}
          />
        ) : (
          <Typography.Text>{String(value ?? "—")}</Typography.Text>
        )
      }
    />
  );
};

export const QuantityCell = ({ index, writable, disabled }: CellProps) => {
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();

  return (
    <Controller<EstimateLineEditorFormValues>
      name={lineFieldPath(index, "quantity")}
      render={({ field: { value, onChange } }) =>
        writable ? (
          <InputNumber
            size="small"
            min={0}
            style={{ width: "100%" }}
            value={Number(value)}
            disabled={disabled}
            onChange={(next) => {
              onChange(next ?? 0);
              setValue(lineFieldPath(index, "qty_manual"), true, { shouldDirty: true });
            }}
          />
        ) : (
          <Typography.Text>{Number(value)}</Typography.Text>
        )
      }
    />
  );
};

export const UnitCell = ({ index, writable, disabled }: CellProps) => (
  <Controller<EstimateLineEditorFormValues>
    name={lineFieldPath(index, "unit")}
    render={({ field: { value, onChange, onBlur } }) =>
      writable ? (
        <Input
          size="small"
          value={String(value ?? "")}
          disabled={disabled}
          onChange={onChange}
          onBlur={onBlur}
        />
      ) : (
        <Typography.Text>{String(value ?? "")}</Typography.Text>
      )
    }
  />
);

export const MoneyCell = ({
  index,
  field,
  writable,
  disabled,
  readOnly = false,
  onValueChange,
  previewing = false,
}: CellProps & {
  field:
    | "unit_cost"
    | "unit_price"
    | "unit_material"
    | "unit_price_target"
    | "unit_freight"
    | "unit_incidental"
    | "unit_labor";
  readOnly?: boolean;
  onValueChange?: (value: number) => void;
  previewing?: boolean;
}) => (
  <Controller<EstimateLineEditorFormValues>
    name={lineFieldPath(index, field)}
    render={({ field: { value, onChange } }) =>
      writable && !readOnly ? (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          prefix="$"
          style={{ width: "100%" }}
          value={Number(value)}
          disabled={disabled}
          onChange={(next) => {
            const resolved = next ?? 0;
            onChange(resolved);
            onValueChange?.(resolved);
          }}
        />
      ) : (
        <Typography.Text type={previewing ? "secondary" : undefined}>
          ${Number(value ?? 0).toFixed(2)}
          {previewing ? "…" : ""}
        </Typography.Text>
      )
    }
  />
);

export const MaterialLockCell = ({
  index,
  disabled,
  onPreview,
}: Omit<PreviewAwareCellProps, "writable">) => {
  const materialLocked = Boolean(
    useWatch({ name: lineFieldPath(index, "material_locked") }),
  );
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();
  const label = materialLocked
    ? "Unlock material (re-resolve PN)"
    : "Lock material (item + part)";

  return (
    <Button
      type="text"
      size="small"
      disabled={disabled}
      title={label}
      aria-label={label}
      icon={materialLocked ? <LockOutlined /> : <UnlockOutlined />}
      onClick={() => {
        if (materialLocked) {
          setValue(lineFieldPath(index, "material_locked"), false, {
            shouldDirty: true,
          });
          onPreview?.(index);
        } else {
          setValue(lineFieldPath(index, "material_locked"), true, {
            shouldDirty: true,
          });
        }
      }}
    />
  );
};

export const SalesLockCell = ({
  index,
  disabled,
}: Omit<PreviewAwareCellProps, "writable" | "onPreview">) => {
  const salesLocked = Boolean(
    useWatch({ name: lineFieldPath(index, "sales_locked") }),
  );
  const unitPriceTarget = useWatch({
    name: lineFieldPath(index, "unit_price_target"),
  });
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();
  const label = salesLocked ? "Unlock sell (sync to target)" : "Lock sell";

  return (
    <Button
      type="text"
      size="small"
      disabled={disabled}
      title={label}
      aria-label={label}
      icon={salesLocked ? <LockOutlined /> : <UnlockOutlined />}
      onClick={() => {
        if (salesLocked) {
          setValue(lineFieldPath(index, "sales_locked"), false, {
            shouldDirty: true,
          });
          setValue(lineFieldPath(index, "unit_price"), Number(unitPriceTarget ?? 0), {
            shouldDirty: true,
          });
        } else {
          setValue(lineFieldPath(index, "sales_locked"), true, {
            shouldDirty: true,
          });
        }
      }}
    />
  );
};

export const SellCell = ({ index, writable, disabled }: CellProps) => {
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();

  return (
    <MoneyCell
      index={index}
      field="unit_price"
      writable={writable}
      disabled={disabled}
      onValueChange={() => {
        setValue(lineFieldPath(index, "sales_locked"), true, { shouldDirty: true });
      }}
    />
  );
};

export const ExtSellCell = ({ index }: { index: number }) => {
  const quantity = useWatch({ name: lineFieldPath(index, "quantity") });
  const unitPrice = useWatch({ name: lineFieldPath(index, "unit_price") });
  const ext = Number(quantity) * Number(unitPrice);
  return <Typography.Text>${(Number.isFinite(ext) ? ext : 0).toFixed(2)}</Typography.Text>;
};

export const TotalSellFooter = ({ lineIds }: { lineIds?: string[] }) => {
  const lines = useWatch({ name: "line_items" }) as EstimateLineFormRow[] | undefined;
  const visibleIds = lineIds ? new Set(lineIds) : null;
  const total = (lines ?? []).reduce((sum, row) => {
    if (visibleIds && !visibleIds.has(row.id)) {
      return sum;
    }
    return sum + Number(row.quantity) * Number(row.unit_price);
  }, 0);

  return (
    <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0, textAlign: "right" }}>
      <Typography.Text strong>Total sell: </Typography.Text>
      <Typography.Text>${total.toFixed(2)}</Typography.Text>
    </Typography.Paragraph>
  );
};
