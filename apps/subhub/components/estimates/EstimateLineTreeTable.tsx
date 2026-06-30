"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { fieldAllows, surfaceAllows, type Manifest } from "@latch/contracts";
import {
  Button,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useMemo, useState, type ReactNode } from "react";
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
  collectSystemLineRemoveIndices,
  estimateSystemIdForParentKey,
  GENERAL_TREE_KEY,
  makeLine,
  makeSpecRowsFromCatalog,
  makeSystemBlock,
  parentKeyForSystemId,
  type EstimateLineEditorFormValues,
  type EstimateLineFormRow,
  type EstimateLineKind,
  type EstimateLineRole,
  type EstimateLineTreeNode,
  type TreeRowKind,
} from "@/components/estimates/estimate-line-tree";
import { EstimateSystemSpecFields } from "@/components/estimates/EstimateSystemSpecFields";
import { FormSection } from "@/components/form/FormSection";
import { useFormUi } from "@/components/surface/useFormUi";
import { useEstimateSystemPicker } from "@/lib/hooks/use-estimate-system-picker";

type EstimateLineTreeTableProps = {
  manifest: Manifest;
};

const LINE_KIND_OPTIONS: Array<{ value: EstimateLineKind; label: string }> = [
  { value: "product", label: "Product" },
  { value: "labor", label: "Labor" },
  { value: "expense", label: "Expense" },
];

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

const KindCell = ({ index, writable, disabled }: CellProps) => (
  <Controller<EstimateLineEditorFormValues>
    name={lineFieldPath(index, "line_kind")}
    render={({ field: { value, onChange } }) =>
      writable ? (
        <Select
          size="small"
          style={{ width: "100%" }}
          options={LINE_KIND_OPTIONS}
          value={value as EstimateLineKind}
          onChange={onChange}
          disabled={disabled}
        />
      ) : (
        <Typography.Text>{String(value)}</Typography.Text>
      )
    }
  />
);

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
}: CellProps & { field: "unit_cost" | "unit_price" }) => (
  <Controller<EstimateLineEditorFormValues>
    name={lineFieldPath(index, field)}
    render={({ field: { value, onChange } }) =>
      writable ? (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          prefix="$"
          style={{ width: "100%" }}
          value={Number(value)}
          disabled={disabled}
          onChange={(next) => onChange(next ?? 0)}
        />
      ) : (
        <Typography.Text>${Number(value).toFixed(2)}</Typography.Text>
      )
    }
  />
);

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
  rowKind === "general" || rowKind === "system";

const isFullSpanRow = (rowKind: TreeRowKind): boolean =>
  rowKind === "general" || rowKind === "system" || rowKind === "specs";

const parentCellProps = (rowKind: TreeRowKind, columnCount: number) =>
  isFullSpanRow(rowKind) ? { colSpan: columnCount } : {};

const hiddenParentCellProps = (rowKind: TreeRowKind) =>
  isFullSpanRow(rowKind) ? { colSpan: 0 } : {};

type ParentRowChromeProps = {
  label: string;
  rowKind: TreeRowKind;
  disabled: boolean;
  writableLines: boolean;
  allowRemoveSystem: boolean;
  onAddLine: () => void;
  onRemove?: () => void;
};

const ParentRowChrome = ({
  label,
  rowKind,
  disabled,
  writableLines,
  allowRemoveSystem,
  onAddLine,
  onRemove,
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
      {rowKind === "system" && allowRemoveSystem && onRemove ? (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          aria-label="Remove system block"
          disabled={disabled}
          onClick={onRemove}
        />
      ) : null}
    </Space>
  </div>
);

export const EstimateLineTreeTable = ({ manifest }: EstimateLineTreeTableProps) => {
  const { control, getValues, setValue } = useFormContext<EstimateLineEditorFormValues>();
  const {
    append: appendLine,
    insert: insertLine,
    remove: removeLines,
  } = useFieldArray({ control, name: "line_items" });
  const { append: appendSystem, remove: removeSystem } = useFieldArray({
    control,
    name: "systems",
  });
  const { disabled } = useFormUi();

  const watchedSystems = useWatch({ control, name: "systems" }) as
    | EstimateLineEditorFormValues["systems"]
    | undefined;
  const watchedLines = useWatch({ control, name: "line_items" }) as
    | EstimateLineFormRow[]
    | undefined;

  const systems = watchedSystems ?? [];
  const lineItems = watchedLines ?? [];

  const [focusedParentKey, setFocusedParentKey] = useState(GENERAL_TREE_KEY);
  const [addSystemOpen, setAddSystemOpen] = useState(false);
  const [pickedSystemId, setPickedSystemId] = useState<string | null>(null);

  const { data: systemPicker, isLoading: systemPickerLoading } = useEstimateSystemPicker();

  const writableLines = fieldAllows(manifest, "line_items", "write");
  const writableSystems = fieldAllows(manifest, "systems", "write");
  const allowRemoveLine = writableLines || surfaceAllows(manifest, "delete");
  const allowRemoveSystem = writableSystems || surfaceAllows(manifest, "delete");

  const treeData = useMemo(
    () => buildLineTree(systems, lineItems),
    [lineItems, systems],
  );

  const lineIndexById = useMemo(() => {
    const map = new Map<string, number>();
    lineItems.forEach((line, index) => {
      map.set(line.id, index);
    });
    return map;
  }, [lineItems]);

  const usedCatalogSystemIds = useMemo(
    () => new Set(systems.map((system) => system.system_id)),
    [systems],
  );

  const catalogSystemOptions = useMemo(
    () =>
      (systemPicker?.data.rows ?? [])
        .filter((row) => !usedCatalogSystemIds.has(row.id))
        .map((row) => ({ value: row.id, label: row.name })),
    [systemPicker?.data.rows, usedCatalogSystemIds],
  );

  const addLineUnderParent = useCallback(
    (parentKey: string) => {
      const estimateSystemId = estimateSystemIdForParentKey(parentKey, systems);
      appendLine(makeLine({ estimate_system_id: estimateSystemId }));
      setFocusedParentKey(parentKey);
    },
    [appendLine, systems],
  );

  const addKitUnderParent = useCallback(
    (parentKey: string) => {
      const estimateSystemId = estimateSystemIdForParentKey(parentKey, systems);
      const header = makeLine({
        estimate_system_id: estimateSystemId,
        line_role: "kit_header",
        description: "",
        unit: "kit",
      });
      const component = makeLine({
        estimate_system_id: estimateSystemId,
        line_role: "kit_component",
        parent_line_id: header.id,
      });
      appendLine([header, component]);
      setFocusedParentKey(parentKey);
    },
    [appendLine, systems],
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
          estimate_system_id: header.estimate_system_id,
        }),
      );
    },
    [getValues, insertLine],
  );

  const removeLineAt = useCallback(
    (lineIndex: number) => {
      const lines = getValues("line_items");
      removeLines(collectLineRemoveIndices(lines, lineIndex));
    },
    [getValues, removeLines],
  );

  const removeSystemBlock = useCallback(
    (systemIndex: number) => {
      const currentSystems = getValues("systems");
      const system = currentSystems[systemIndex];
      if (!system) {
        return;
      }

      const lines = getValues("line_items");
      removeLines(collectSystemLineRemoveIndices(lines, system.id));
      removeSystem(systemIndex);

      const nextSystems = getValues("systems").map((row, index) => ({
        ...row,
        sort_order: index + 1,
      }));
      setValue("systems", nextSystems, { shouldDirty: true });

      if (focusedParentKey === parentKeyForSystemId(system.id)) {
        setFocusedParentKey(GENERAL_TREE_KEY);
      }
    },
    [focusedParentKey, getValues, removeLines, removeSystem, setValue],
  );

  const confirmAddSystem = useCallback(() => {
    if (!pickedSystemId) {
      return;
    }

    const catalogRow = systemPicker?.data.rows.find((row) => row.id === pickedSystemId);
    if (!catalogRow) {
      return;
    }

    const nextSortOrder = systems.length + 1;
    const specs = makeSpecRowsFromCatalog(catalogRow.spec_defs ?? []);
    const block = makeSystemBlock(
      catalogRow.id,
      catalogRow.name,
      nextSortOrder,
      specs,
    );
    appendSystem(block);
    setFocusedParentKey(parentKeyForSystemId(block.id));
    setPickedSystemId(null);
    setAddSystemOpen(false);
  }, [appendSystem, pickedSystemId, systemPicker?.data.rows, systems.length]);

  const showActionsColumn = writableLines || allowRemoveLine;
  const columnCount = showActionsColumn ? 8 : 7;

  const columns = useMemo((): ColumnsType<EstimateLineTreeNode> => {
    const parentChrome = (
      record: EstimateLineTreeNode,
      onRemove?: () => void,
    ): ReactNode => (
      <ParentRowChrome
        label={record.label ?? ""}
        rowKind={record.rowKind}
        disabled={disabled}
        writableLines={writableLines}
        allowRemoveSystem={allowRemoveSystem}
        onAddLine={() => addLineUnderParent(record.key)}
        onRemove={onRemove}
      />
    );

    return [
      {
        key: "line_kind",
        title: "Kind",
        width: 120,
        onCell: (record) =>
          isFullSpanRow(record.rowKind) ? parentCellProps(record.rowKind, columnCount) : {},
        render: (_value, record) => {
          if (record.rowKind === "specs" && record.systemIndex !== undefined) {
            return (
              <EstimateSystemSpecFields
                systemIndex={record.systemIndex}
                writable={writableSystems}
                disabled={disabled}
              />
            );
          }

          if (isParentRow(record.rowKind)) {
            return parentChrome(
              record,
              record.rowKind === "system" && record.systemIndex !== undefined
                ? () => removeSystemBlock(record.systemIndex as number)
                : undefined,
            );
          }

          const lineIndex = record.lineId ? lineIndexById.get(record.lineId) : undefined;
          if (lineIndex === undefined) {
            return null;
          }

          return <KindCell index={lineIndex} writable={writableLines} disabled={disabled} />;
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
        key: "unit_cost",
        title: "Cost",
        width: 120,
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
            />
          );
        },
      },
      {
        key: "unit_price",
        title: "Sell",
        width: 120,
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
              field="unit_price"
              writable={writableLines}
              disabled={disabled}
            />
          );
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
    allowRemoveSystem,
    columnCount,
    disabled,
    lineIndexById,
    removeLineAt,
    removeSystemBlock,
    showActionsColumn,
    writableLines,
    writableSystems,
  ]);

  return (
    <FormSection title="Line items">
      {writableSystems ? (
        <Space style={{ marginBottom: 12 }}>
          <Button
            icon={<PlusOutlined />}
            disabled={disabled || catalogSystemOptions.length === 0}
            onClick={() => setAddSystemOpen(true)}
          >
            Add system
          </Button>
        </Space>
      ) : null}

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
            if (record.rowKind === "general" || record.rowKind === "system") {
              setFocusedParentKey(record.key);
            }
          },
          style:
            isParentRow(record.rowKind) && record.key === focusedParentKey
              ? FOCUSED_PARENT_ROW_STYLE
              : record.rowKind === "specs"
                ? { background: "var(--ant-color-fill-quaternary, #fafafa)" }
                : isParentRow(record.rowKind)
                  ? PARENT_ROW_STYLE
                  : undefined,
        })}
      />

      {writableLines ? (
        <Space style={{ marginTop: 12 }}>
          <Button
            icon={<PlusOutlined />}
            disabled={disabled}
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

      <Modal
        title="Add system"
        open={addSystemOpen}
        okText="Add"
        okButtonProps={{ disabled: !pickedSystemId }}
        onOk={confirmAddSystem}
        onCancel={() => {
          setAddSystemOpen(false);
          setPickedSystemId(null);
        }}
      >
        <Select
          showSearch
          allowClear
          placeholder="Catalog system"
          style={{ width: "100%" }}
          loading={systemPickerLoading}
          options={catalogSystemOptions}
          value={pickedSystemId}
          optionFilterProp="label"
          onChange={(value) => setPickedSystemId(value ?? null)}
        />
      </Modal>
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
  EstimateLineKind,
  EstimateLineRole,
  EstimateSystemFormRow,
} from "@/components/estimates/estimate-line-tree";
