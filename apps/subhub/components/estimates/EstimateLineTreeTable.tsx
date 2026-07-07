"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { fieldAllows, surfaceAllows, type Manifest } from "@latch/contracts";
import {
  Button,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect,
  Typography,
} from "antd";
import type { TreeSelectProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldPath,
} from "react-hook-form";

import {
  buildLineTree,
  collectLineRemoveIndices,
  parentTargetForKey,
  makeLine,
  type EstimateLineEditorFormValues,
  type EstimateLineFormRow,
  type EstimateLineRole,
  type EstimateLineTreeNode,
  type EstimateScopeFormRow,
  type TreeRowKind,
} from "@/components/estimates/estimate-line-tree";
import {
  useEstimateItemPicker,
  useEstimatePartPicker,
  type ItemTreeNode,
} from "@/lib/hooks/use-estimate-item-picker";
import { FormSection } from "@/components/form/FormSection";
import { useFormUi } from "@/components/surface/useFormUi";

type EstimateLineTreeTableProps = {
  manifest: Manifest;
  siteSelected?: boolean;
};

const toAntdItemTree = (nodes: ItemTreeNode[]): TreeSelectProps["treeData"] =>
  nodes.map((node) => ({
    value: node.value,
    title: node.label,
    selectable: node.selectable,
    children: node.children ? toAntdItemTree(node.children) : undefined,
  }));

const PARENT_ROW_STYLE = {
  background: "var(--ant-color-fill-quaternary, #fafafa)",
  cursor: "pointer",
} as const;

const FOCUSED_PARENT_ROW_STYLE = {
  ...PARENT_ROW_STYLE,
  outline: "2px solid var(--ant-color-primary, #1677ff)",
  outlineOffset: -2,
} as const;

const lineFieldPath = (
  index: number,
  key: keyof EstimateLineFormRow,
): FieldPath<EstimateLineEditorFormValues> =>
  `line_items.${index}.${key}` as FieldPath<EstimateLineEditorFormValues>;

const roleTag = (role: EstimateLineRole) => {
  if (role === "kit_header") {
    return <Tag color="blue">Kit</Tag>;
  }
  if (role === "kit_component") {
    return <Tag>Component</Tag>;
  }
  return null;
};

type CellProps = {
  index: number;
  writable: boolean;
  disabled: boolean;
};

const ItemCell = ({
  index,
  writable,
  disabled,
  scopes,
}: CellProps & { scopes: EstimateScopeFormRow[] }) => {
  const estimateScopeId = useWatch({
    name: lineFieldPath(index, "estimate_scope_id"),
  }) as string | null | undefined;
  const rootItemId =
    scopes.find((scope) => scope.id === estimateScopeId)?.root_item_id ?? null;
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
            disabled={disabled || !rootItemId}
            placeholder={rootItemId ? "Select item" : "Scope required"}
            onChange={onChange}
            treeDefaultExpandAll
          />
        ) : (
          <Typography.Text>{String(value ?? "—")}</Typography.Text>
        )
      }
    />
  );
};

const PartCell = ({
  index,
  writable,
  disabled,
  scopes,
}: CellProps & { scopes: EstimateScopeFormRow[] }) => {
  const itemId = useWatch({ name: lineFieldPath(index, "item_id") }) as string | null;
  const estimateScopeId = useWatch({
    name: lineFieldPath(index, "estimate_scope_id"),
  }) as string | null;
  const siteZoneId = useWatch({ name: lineFieldPath(index, "site_zone_id") }) as string | null;
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();

  const { data: parts } = useEstimatePartPicker(
    itemId,
    estimateScopeId,
    siteZoneId,
    Boolean(itemId && estimateScopeId),
  );

  if (!itemId) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  if (!parts || parts.length <= 1) {
    const single = parts?.[0];
    return (
      <Typography.Text type="secondary">
        {single ? single.mpn : parts?.length === 0 ? "No match" : "—"}
      </Typography.Text>
    );
  }

  return (
    <Controller<EstimateLineEditorFormValues>
      name={lineFieldPath(index, "part_id")}
      render={({ field: { value, onChange } }) =>
        writable ? (
          <Select
            size="small"
            style={{ width: "100%" }}
            allowClear
            placeholder="Pick PN"
            value={value ?? undefined}
            disabled={disabled}
            options={parts.map((part) => ({
              value: part.id,
              label: part.mpn,
            }))}
            onChange={(next) => {
              onChange(next ?? null);
              if (next) {
                setValue(lineFieldPath(index, "lock"), "line", {
                  shouldDirty: true,
                });
              }
            }}
          />
        ) : (
          <Typography.Text>{String(value ?? "—")}</Typography.Text>
        )
      }
    />
  );
};

const DescriptionCell = ({ index, writable, disabled }: CellProps) => {
  const role = useWatch({
    name: lineFieldPath(index, "line_role"),
  }) as EstimateLineRole | undefined;
  const indent = role === "kit_component" ? 24 : 0;

  return (
    <Controller<EstimateLineEditorFormValues>
      name={lineFieldPath(index, "description")}
      render={({ field: { value, onChange, onBlur } }) => (
        <Space size={4} style={{ width: "100%" }}>
          {roleTag(role ?? "standalone")}
          {writable ? (
            <Input
              size="small"
              value={String(value ?? "")}
              disabled={disabled}
              style={{ paddingLeft: indent }}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Description"
            />
          ) : (
            <Typography.Text style={{ paddingLeft: indent }}>
              {String(value ?? "")}
            </Typography.Text>
          )}
        </Space>
      )}
    />
  );
};

const QuantityCell = ({ index, writable, disabled }: CellProps) => (
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
          onChange={(next) => onChange(next ?? 0)}
        />
      ) : (
        <Typography.Text>{Number(value)}</Typography.Text>
      )
    }
  />
);

const UnitCell = ({ index, writable, disabled }: CellProps) => (
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

const MoneyCell = ({
  index,
  field,
  writable,
  disabled,
  readOnly = false,
  onValueChange,
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
        <Typography.Text>${Number(value ?? 0).toFixed(2)}</Typography.Text>
      )
    }
  />
);

const LOCK_CYCLE: EstimateLineFormRow["lock"][] = ["none", "sell", "line"];

const lockLabel = (lock: EstimateLineFormRow["lock"]): string => {
  if (lock === "sell") {
    return "Sell";
  }
  if (lock === "line") {
    return "Line";
  }
  return "Fluid";
};

const LockCell = ({ index, writable, disabled }: CellProps) => {
  const lock = useWatch({ name: lineFieldPath(index, "lock") }) as EstimateLineFormRow["lock"];
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();

  if (!writable) {
    return <Tag>{lockLabel(lock ?? "none")}</Tag>;
  }

  return (
    <Button
      size="small"
      type={lock === "none" ? "default" : "primary"}
      ghost={lock !== "none"}
      disabled={disabled}
      onClick={() => {
        const current = lock ?? "none";
        const nextIndex = (LOCK_CYCLE.indexOf(current) + 1) % LOCK_CYCLE.length;
        setValue(lineFieldPath(index, "lock"), LOCK_CYCLE[nextIndex] ?? "none", {
          shouldDirty: true,
        });
      }}
    >
      {lockLabel(lock ?? "none")}
    </Button>
  );
};

const SellCell = ({ index, writable, disabled }: CellProps) => {
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();

  return (
    <MoneyCell
      index={index}
      field="unit_price"
      writable={writable}
      disabled={disabled}
      onValueChange={() => {
        setValue(lineFieldPath(index, "lock"), "sell", { shouldDirty: true });
      }}
    />
  );
};

const ExtSellCell = ({ index }: { index: number }) => {
  const quantity = useWatch({ name: lineFieldPath(index, "quantity") });
  const unitPrice = useWatch({ name: lineFieldPath(index, "unit_price") });
  const ext = Number(quantity) * Number(unitPrice);
  return <Typography.Text>${(Number.isFinite(ext) ? ext : 0).toFixed(2)}</Typography.Text>;
};

const TotalSellFooter = () => {
  const lines = useWatch({ name: "line_items" }) as EstimateLineFormRow[] | undefined;
  const total = (lines ?? []).reduce(
    (sum, row) => sum + Number(row.quantity) * Number(row.unit_price),
    0,
  );

  return (
    <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0, textAlign: "right" }}>
      <Typography.Text strong>Total sell: </Typography.Text>
      <Typography.Text>${total.toFixed(2)}</Typography.Text>
    </Typography.Paragraph>
  );
};

const isParentRow = (rowKind: TreeRowKind): boolean =>
  rowKind === "scope" || rowKind === "zone";

const parentCellProps = (rowKind: TreeRowKind, columnCount: number) =>
  isParentRow(rowKind) ? { colSpan: columnCount } : {};

const hiddenParentCellProps = (rowKind: TreeRowKind) =>
  isParentRow(rowKind) ? { colSpan: 0 } : {};

type ParentRowChromeProps = {
  label: string;
  disabled: boolean;
  writableLines: boolean;
  onAddLine: () => void;
};

const ParentRowChrome = ({
  label,
  disabled,
  writableLines,
  onAddLine,
}: ParentRowChromeProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      gap: 12,
    }}
  >
    <Typography.Text strong>{label}</Typography.Text>
    <Space size={4} onClick={(event) => event.stopPropagation()}>
      {writableLines ? (
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          disabled={disabled}
          onClick={onAddLine}
        >
          Line
        </Button>
      ) : null}
    </Space>
  </div>
);

export const EstimateLineTreeTable = ({
  manifest,
  siteSelected = true,
}: EstimateLineTreeTableProps) => {
  const { control, getValues } = useFormContext<EstimateLineEditorFormValues>();
  const {
    append: appendLine,
    insert: insertLine,
    remove: removeLines,
  } = useFieldArray({ control, name: "line_items" });
  const { disabled } = useFormUi();

  const watchedScopes = useWatch({ control, name: "scopes" }) as
    | EstimateScopeFormRow[]
    | undefined;
  const watchedLines = useWatch({ control, name: "line_items" }) as
    | EstimateLineFormRow[]
    | undefined;

  const watchedSiteTree = useWatch({ control, name: "site_tree" });
  const scopes = watchedScopes ?? [];
  const lineItems = watchedLines ?? [];

  const [focusedParentKey, setFocusedParentKey] = useState("");

  const writableLines = fieldAllows(manifest, "line_items", "write");
  const allowRemoveLine = writableLines || surfaceAllows(manifest, "delete");
  const canAddLines = scopes.length > 0;

  const treeData = useMemo(
    () => buildLineTree(scopes, lineItems, watchedSiteTree),
    [lineItems, scopes, watchedSiteTree],
  );

  useEffect(() => {
    if (!focusedParentKey && treeData[0]?.key) {
      setFocusedParentKey(treeData[0].key);
    }
  }, [focusedParentKey, treeData]);

  const addLineUnderParent = useCallback(
    (parentKey: string) => {
      const target = parentTargetForKey(parentKey, scopes);
      if (!target) {
        return;
      }

      appendLine(
        makeLine({
          estimate_scope_id: target.estimate_scope_id,
          site_zone_id: target.site_zone_id,
        }),
      );
      setFocusedParentKey(parentKey);
    },
    [appendLine, scopes],
  );

  const addKitUnderParent = useCallback(
    (parentKey: string) => {
      const target = parentTargetForKey(parentKey, scopes);
      if (!target) {
        return;
      }

      const header = makeLine({
        estimate_scope_id: target.estimate_scope_id,
        site_zone_id: target.site_zone_id,
        line_role: "kit_header",
        description: "",
        unit: "kit",
      });
      const component = makeLine({
        estimate_scope_id: target.estimate_scope_id,
        site_zone_id: target.site_zone_id,
        line_role: "kit_component",
        parent_line_id: header.id,
      });
      appendLine([header, component]);
      setFocusedParentKey(parentKey);
    },
    [appendLine, scopes],
  );

  const addComponent = useCallback(
    (headerIndex: number) => {
      const lines = getValues("line_items");
      const header = lines[headerIndex];
      if (!header) {
        return;
      }

      let insertAt = headerIndex + 1;
      for (let index = headerIndex + 1; index < lines.length; index += 1) {
        if (lines[index]?.parent_line_id === header.id) {
          insertAt = index + 1;
        } else {
          break;
        }
      }

      insertLine(
        insertAt,
        makeLine({
          line_role: "kit_component",
          parent_line_id: header.id,
          estimate_scope_id: header.estimate_scope_id,
        }),
      );
    },
    [getValues, insertLine],
  );

  const lineIndexById = useMemo(() => {
    const map = new Map<string, number>();
    lineItems.forEach((line, index) => {
      map.set(line.id, index);
    });
    return map;
  }, [lineItems]);

  const removeLineAt = useCallback(
    (lineIndex: number) => {
      const lines = getValues("line_items");
      removeLines(collectLineRemoveIndices(lines, lineIndex));
    },
    [getValues, removeLines],
  );

  const showActionsColumn = writableLines || allowRemoveLine;
  const columnCount = showActionsColumn ? 15 : 14;

  const columns = useMemo((): ColumnsType<EstimateLineTreeNode> => {
    const parentChrome = (record: EstimateLineTreeNode): ReactNode => (
      <ParentRowChrome
        label={record.label ?? ""}
        disabled={disabled}
        writableLines={writableLines}
        onAddLine={() => addLineUnderParent(record.key)}
      />
    );

    return [
      {
        key: "item_id",
        title: "Item",
        width: 160,
        onCell: (record) =>
          isParentRow(record.rowKind) ? parentCellProps(record.rowKind, columnCount) : {},
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return parentChrome(record);
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <ItemCell
              index={lineIndex}
              writable={writableLines}
              disabled={disabled}
              scopes={scopes}
            />
          );
        },
      },
      {
        key: "part_id",
        title: "Part",
        width: 130,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <PartCell
              index={lineIndex}
              writable={writableLines}
              disabled={disabled}
              scopes={scopes}
            />
          );
        },
      },
      {
        key: "description",
        title: "Description",
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <DescriptionCell index={lineIndex} writable={writableLines} disabled={disabled} />
          );
        },
      },
      {
        key: "quantity",
        title: "Qty",
        width: 90,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <QuantityCell index={lineIndex} writable={writableLines} disabled={disabled} />
          );
        },
      },
      {
        key: "unit",
        title: "Unit",
        width: 80,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return <UnitCell index={lineIndex} writable={writableLines} disabled={disabled} />;
        },
      },
      {
        key: "unit_material",
        title: "Material",
        width: 100,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <MoneyCell
              index={lineIndex}
              field="unit_material"
              writable={writableLines}
              disabled={disabled}
              readOnly
            />
          );
        },
      },
      {
        key: "unit_freight",
        title: "Freight",
        width: 90,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <MoneyCell
              index={lineIndex}
              field="unit_freight"
              writable={writableLines}
              disabled={disabled}
              readOnly
            />
          );
        },
      },
      {
        key: "unit_incidental",
        title: "Incidental",
        width: 90,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <MoneyCell
              index={lineIndex}
              field="unit_incidental"
              writable={writableLines}
              disabled={disabled}
              readOnly
            />
          );
        },
      },
      {
        key: "unit_labor",
        title: "Labor",
        width: 90,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <MoneyCell
              index={lineIndex}
              field="unit_labor"
              writable={writableLines}
              disabled={disabled}
              readOnly
            />
          );
        },
      },
      {
        key: "unit_price_target",
        title: "Target",
        width: 100,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <MoneyCell
              index={lineIndex}
              field="unit_price_target"
              writable={writableLines}
              disabled={disabled}
              readOnly
            />
          );
        },
      },
      {
        key: "unit_cost",
        title: "Cost",
        width: 110,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <MoneyCell
              index={lineIndex}
              field="unit_cost"
              writable={writableLines}
              disabled={disabled}
              readOnly
            />
          );
        },
      },
      {
        key: "lock",
        title: "Lock",
        width: 80,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return (
            <LockCell index={lineIndex} writable={writableLines} disabled={disabled} />
          );
        },
      },
      {
        key: "unit_price",
        title: "Sell",
        width: 100,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return <SellCell index={lineIndex} writable={writableLines} disabled={disabled} />;
        },
      },
      {
        key: "_ext_sell",
        title: "Ext sell",
        width: 100,
        onCell: (record) => hiddenParentCellProps(record.rowKind),
        render: (_value, record) => {
          if (isParentRow(record.rowKind)) {
            return null;
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return <ExtSellCell index={lineIndex} />;
        },
      },
      ...(showActionsColumn
        ? [
            {
              key: "_actions",
              title: "",
              width: 80,
              onCell: (record: EstimateLineTreeNode) =>
                hiddenParentCellProps(record.rowKind),
              render: (_value: unknown, record: EstimateLineTreeNode) => {
                if (isParentRow(record.rowKind)) {
                  return null;
                }

                const lineIndex = record.lineId
                  ? lineIndexById.get(record.lineId)
                  : undefined;
                if (lineIndex === undefined) {
                  return null;
                }

                return (
                  <LineRowActions
                    lineIndex={lineIndex}
                    disabled={disabled}
                    writable={writableLines}
                    allowRemove={allowRemoveLine}
                    onAddComponent={addComponent}
                    onRemove={removeLineAt}
                  />
                );
              },
            },
          ]
        : []),
    ];
  }, [
    addComponent,
    addLineUnderParent,
    allowRemoveLine,
    columnCount,
    disabled,
    lineIndexById,
    removeLineAt,
    showActionsColumn,
    writableLines,
    scopes,
  ]);

  if (!siteSelected) {
    return null;
  }

  if (!canAddLines) {
    return (
      <FormSection title="Line items">
        <Typography.Paragraph type="secondary">
          Check at least one scope on the Scope tab before adding line items.
        </Typography.Paragraph>
      </FormSection>
    );
  }

  return (
    <FormSection title="Line items">
      <Table<EstimateLineTreeNode>
        columns={columns}
        dataSource={treeData}
        rowKey="key"
        pagination={false}
        size="small"
        scroll={{ x: true }}
        locale={{ emptyText: "No lines" }}
        expandable={{ defaultExpandAllRows: true, indentSize: 20 }}
        onRow={(record) => ({
          onClick: () => {
            if (record.rowKind === "scope" || record.rowKind === "zone") {
              setFocusedParentKey(record.key);
            }
          },
          style:
            isParentRow(record.rowKind) && record.key === focusedParentKey
              ? FOCUSED_PARENT_ROW_STYLE
              : isParentRow(record.rowKind)
                ? PARENT_ROW_STYLE
                : undefined,
        })}
      />

      {writableLines ? (
        <Space style={{ marginTop: 12 }}>
          <Button
            icon={<PlusOutlined />}
            disabled={disabled || !canAddLines || !focusedParentKey}
            onClick={() => addLineUnderParent(focusedParentKey)}
          >
            Add line
          </Button>
          <Button disabled={disabled} onClick={() => addKitUnderParent(focusedParentKey)}>
            Add kit (header + component)
          </Button>
        </Space>
      ) : null}

      <TotalSellFooter />
    </FormSection>
  );
};

type LineRowActionsProps = {
  lineIndex: number;
  disabled: boolean;
  writable: boolean;
  allowRemove: boolean;
  onAddComponent: (index: number) => void;
  onRemove: (index: number) => void;
};

const LineRowActions = ({
  lineIndex,
  disabled,
  writable,
  allowRemove,
  onAddComponent,
  onRemove,
}: LineRowActionsProps) => {
  const role = useWatch({
    name: lineFieldPath(lineIndex, "line_role"),
  }) as EstimateLineRole | undefined;

  return (
    <Space size={0}>
      {writable && role === "kit_header" ? (
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          aria-label="Add kit component"
          disabled={disabled}
          onClick={() => onAddComponent(lineIndex)}
        />
      ) : null}
      {allowRemove ? (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          aria-label="Remove line"
          disabled={disabled}
          onClick={() => onRemove(lineIndex)}
        />
      ) : null}
    </Space>
  );
};

export type {
  EstimateLineFormRow,
  EstimateLineRole,
  EstimateScopeFormRow,
} from "@/components/estimates/estimate-line-tree";
