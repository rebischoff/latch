"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { fieldAllows, surfaceAllows, type Manifest } from "@latch/contracts";
import { Button, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import {
  collectLineRemoveIndices,
  makeLine,
  type EstimateConditionFormRow,
  type EstimateLineEditorFormValues,
  type EstimateLineFormRow,
} from "@/components/estimates/estimate-line-tree";
import {
  DescriptionCell,
  ExtSellCell,
  ItemCell,
  LINE_TABLE_COLUMN_WIDTHS,
  LockCell,
  MoneyCell,
  PartCell,
  QuantityCell,
  SellCell,
  TotalSellFooter,
  UnitCell,
  lineTableScrollX,
} from "@/components/estimates/estimate-line-cells";
import {
  emptyLineItemsCopy,
  filterLinesForSelection,
  type EstimateBucketSelection,
} from "@/components/estimates/estimate-line-selection";
import { EstimateLinePlacesButton } from "@/components/estimates/EstimateLinePlacesButton";
import { useFormUi } from "@/components/surface/useFormUi";

type FlatLineRow = {
  index: number;
  line: EstimateLineFormRow;
};

type EstimateLineFlatTableProps = {
  manifest: Manifest;
  selection: EstimateBucketSelection | null;
};

export const EstimateLineFlatTable = ({
  manifest,
  selection,
}: EstimateLineFlatTableProps) => {
  const { control, getValues } = useFormContext<EstimateLineEditorFormValues>();
  const { append: appendLine, remove: removeLines } = useFieldArray({
    control,
    name: "line_items",
  });
  const { disabled } = useFormUi();

  const conditions = (useWatch({ control, name: "conditions" }) ??
    []) as EstimateConditionFormRow[];
  const lineItems = (useWatch({ control, name: "line_items" }) ??
    []) as EstimateLineFormRow[];
  const siteTree = useWatch({ control, name: "site_tree" });

  const writableLines = fieldAllows(manifest, "line_items", "write");
  const allowRemoveLine = writableLines || surfaceAllows(manifest, "delete");
  const showActionsColumn = writableLines || allowRemoveLine;

  const filteredLines = useMemo(
    () => (selection ? filterLinesForSelection(lineItems, selection) : []),
    [lineItems, selection],
  );

  const flatRows = useMemo((): FlatLineRow[] => {
    const rows: FlatLineRow[] = [];
    lineItems.forEach((line, index) => {
      if (filteredLines.some((filtered) => filtered.id === line.id)) {
        rows.push({ index, line });
      }
    });
    return rows;
  }, [filteredLines, lineItems]);

  const handleAddLine = useCallback(() => {
    if (!selection) {
      return;
    }

    appendLine(
      makeLine({
        estimate_condition_id: selection.estimateConditionId,
      }),
    );
  }, [appendLine, selection]);

  const removeLineAt = useCallback(
    (lineIndex: number) => {
      const lines = getValues("line_items");
      removeLines(collectLineRemoveIndices(lines, lineIndex));
    },
    [getValues, removeLines],
  );

  const columns = useMemo((): ColumnsType<FlatLineRow> => {
    const base: ColumnsType<FlatLineRow> = [
      {
        key: "item_id",
        title: "Item",
        width: LINE_TABLE_COLUMN_WIDTHS.item_id,
        fixed: "left",
        render: (_value, record) => (
          <ItemCell
            index={record.index}
            writable={writableLines}
            disabled={disabled}
            conditions={conditions}
          />
        ),
      },
      {
        key: "part_id",
        title: "Part",
        width: LINE_TABLE_COLUMN_WIDTHS.part_id,
        render: (_value, record) => (
          <PartCell
            index={record.index}
            writable={writableLines}
            disabled={disabled}
          />
        ),
      },
      {
        key: "description",
        title: "Description",
        width: LINE_TABLE_COLUMN_WIDTHS.description,
        render: (_value, record) => (
          <DescriptionCell index={record.index} writable={writableLines} disabled={disabled} />
        ),
      },
      {
        key: "quantity",
        title: "Qty",
        width: LINE_TABLE_COLUMN_WIDTHS.quantity,
        render: (_value, record) => (
          <QuantityCell index={record.index} writable={writableLines} disabled={disabled} />
        ),
      },
      {
        key: "unit",
        title: "Unit",
        width: LINE_TABLE_COLUMN_WIDTHS.unit,
        render: (_value, record) => (
          <UnitCell index={record.index} writable={writableLines} disabled={disabled} />
        ),
      },
      {
        key: "unit_material",
        title: "Material",
        width: LINE_TABLE_COLUMN_WIDTHS.unit_material,
        render: (_value, record) => (
          <MoneyCell
            index={record.index}
            field="unit_material"
            writable={writableLines}
            disabled={disabled}
            readOnly
          />
        ),
      },
      {
        key: "unit_freight",
        title: "Freight",
        width: LINE_TABLE_COLUMN_WIDTHS.unit_freight,
        render: (_value, record) => (
          <MoneyCell
            index={record.index}
            field="unit_freight"
            writable={writableLines}
            disabled={disabled}
            readOnly
          />
        ),
      },
      {
        key: "unit_incidental",
        title: "Incidental",
        width: LINE_TABLE_COLUMN_WIDTHS.unit_incidental,
        render: (_value, record) => (
          <MoneyCell
            index={record.index}
            field="unit_incidental"
            writable={writableLines}
            disabled={disabled}
            readOnly
          />
        ),
      },
      {
        key: "unit_labor",
        title: "Labor",
        width: LINE_TABLE_COLUMN_WIDTHS.unit_labor,
        render: (_value, record) => (
          <MoneyCell
            index={record.index}
            field="unit_labor"
            writable={writableLines}
            disabled={disabled}
            readOnly
          />
        ),
      },
      {
        key: "unit_price_target",
        title: "Target",
        width: LINE_TABLE_COLUMN_WIDTHS.unit_price_target,
        render: (_value, record) => (
          <MoneyCell
            index={record.index}
            field="unit_price_target"
            writable={writableLines}
            disabled={disabled}
            readOnly
          />
        ),
      },
      {
        key: "unit_cost",
        title: "Cost",
        width: LINE_TABLE_COLUMN_WIDTHS.unit_cost,
        render: (_value, record) => (
          <MoneyCell
            index={record.index}
            field="unit_cost"
            writable={writableLines}
            disabled={disabled}
            readOnly
          />
        ),
      },
      {
        key: "lock",
        title: "Lock",
        width: LINE_TABLE_COLUMN_WIDTHS.lock,
        render: (_value, record) => (
          <LockCell index={record.index} writable={writableLines} disabled={disabled} />
        ),
      },
      {
        key: "unit_price",
        title: "Sell",
        width: LINE_TABLE_COLUMN_WIDTHS.unit_price,
        render: (_value, record) => (
          <SellCell index={record.index} writable={writableLines} disabled={disabled} />
        ),
      },
      {
        key: "_ext_sell",
        title: "Ext sell",
        width: LINE_TABLE_COLUMN_WIDTHS.ext_sell,
        render: (_value, record) => <ExtSellCell index={record.index} />,
      },
    ];

    if (showActionsColumn) {
      base.push({
        key: "_actions",
        title: "",
        width: LINE_TABLE_COLUMN_WIDTHS.actions + 72,
        render: (_value, record) => (
          <Space size={0}>
            {writableLines ? (
              <EstimateLinePlacesButton
                index={record.index}
                disabled={disabled}
                siteTree={siteTree}
              />
            ) : null}
            {allowRemoveLine ? (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                aria-label="Remove line"
                disabled={disabled}
                onClick={() => removeLineAt(record.index)}
              />
            ) : null}
          </Space>
        ),
      });
    }

    return base;
  }, [
    allowRemoveLine,
    conditions,
    disabled,
    removeLineAt,
    showActionsColumn,
    siteTree,
    writableLines,
  ]);

  const canAddLine = writableLines && Boolean(selection) && !disabled;
  const emptyCopy = emptyLineItemsCopy(selection);

  return (
    <div style={{ minWidth: 0 }}>
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
        Line items
      </Typography.Text>

      <Table<FlatLineRow>
        columns={columns}
        dataSource={flatRows}
        rowKey={(record) => record.line.id}
        pagination={false}
        size="small"
        scroll={{ x: lineTableScrollX(showActionsColumn) }}
        locale={{ emptyText: emptyCopy }}
        footer={
          writableLines
            ? () => (
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  disabled={!canAddLine}
                  onClick={handleAddLine}
                >
                  Add line
                </Button>
              )
            : undefined
        }
      />

      <TotalSellFooter lineIds={filteredLines.map((line) => line.id)} />
    </div>
  );
};
