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
  Typography,
} from "antd";
import { useCallback, useMemo } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldPath,
} from "react-hook-form";

import { FormSection } from "@/components/form/FormSection";
import { useFormUi } from "@/components/surface/useFormUi";

export type EstimateLineKind = "product" | "labor" | "expense";
export type EstimateLineRole = "standalone" | "kit_header" | "kit_component";

/** Flat line row — keys mirror the writable PATCH element exactly. */
export type EstimateLineFormRow = {
  id: string;
  line_role: EstimateLineRole;
  line_kind: EstimateLineKind;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  unit_price: number;
  parent_line_id: string | null;
  estimate_section_id: string | null;
  site_location_id: string | null;
  phase_id: string | null;
  item_id: string | null;
  part_id: string | null;
  vendor_part_id: string | null;
};

export type EstimateLineItemsFormValues = {
  line_items: EstimateLineFormRow[];
};

type EstimateLineItemsFieldProps = {
  manifest: Manifest;
};

const LINE_KIND_OPTIONS: Array<{ value: EstimateLineKind; label: string }> = [
  { value: "product", label: "Product" },
  { value: "labor", label: "Labor" },
  { value: "expense", label: "Expense" },
];

const lineFieldPath = (
  index: number,
  key: keyof EstimateLineFormRow,
): FieldPath<EstimateLineItemsFormValues> =>
  `line_items.${index}.${key}` as FieldPath<EstimateLineItemsFormValues>;

/** Blank line with a stable client id (kit linkage references this id). */
const makeLine = (overrides: Partial<EstimateLineFormRow>): EstimateLineFormRow => ({
  id: crypto.randomUUID(),
  line_role: "standalone",
  line_kind: "product",
  description: "",
  quantity: 1,
  unit: "ea",
  unit_cost: 0,
  unit_price: 0,
  parent_line_id: null,
  estimate_section_id: null,
  site_location_id: null,
  phase_id: null,
  item_id: null,
  part_id: null,
  vendor_part_id: null,
  ...overrides,
});

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
  <Controller<EstimateLineItemsFormValues>
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
    <Controller<EstimateLineItemsFormValues>
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
  <Controller<EstimateLineItemsFormValues>
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
  <Controller<EstimateLineItemsFormValues>
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
  <Controller<EstimateLineItemsFormValues>
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
  const lines = useWatch({ name: "line_items" }) as
    | EstimateLineFormRow[]
    | undefined;
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

export const EstimateLineItemsField = ({
  manifest,
}: EstimateLineItemsFieldProps) => {
  const { control, getValues } = useFormContext<EstimateLineItemsFormValues>();
  const { fields, append, insert, remove } = useFieldArray({
    control,
    name: "line_items",
  });
  const { disabled } = useFormUi();

  const writable = fieldAllows(manifest, "line_items", "write");
  const allowRemove = writable || surfaceAllows(manifest, "delete");

  const addLine = useCallback(() => {
    append(makeLine({}));
  }, [append]);

  const addKit = useCallback(() => {
    const header = makeLine({
      line_role: "kit_header",
      description: "",
      unit: "kit",
    });
    const component = makeLine({
      line_role: "kit_component",
      parent_line_id: header.id,
    });
    append([header, component]);
  }, [append]);

  const addComponent = useCallback(
    (headerIndex: number) => {
      const lines = getValues("line_items");
      const header = lines[headerIndex];
      if (!header) {
        return;
      }

      let insertAt = headerIndex + 1;
      for (let i = headerIndex + 1; i < lines.length; i += 1) {
        if (lines[i]?.parent_line_id === header.id) {
          insertAt = i + 1;
        } else {
          break;
        }
      }

      insert(
        insertAt,
        makeLine({ line_role: "kit_component", parent_line_id: header.id }),
      );
    },
    [getValues, insert],
  );

  const removeLine = useCallback(
    (index: number) => {
      const lines = getValues("line_items");
      const row = lines[index];
      if (!row) {
        return;
      }

      const indices = [index];
      if (row.line_role === "kit_header") {
        lines.forEach((line, i) => {
          if (line.parent_line_id === row.id) {
            indices.push(i);
          }
        });
      }

      remove(indices);
    },
    [getValues, remove],
  );

  const columns = useMemo(
    () => [
      {
        key: "_number",
        title: "#",
        width: 40,
        render: (_: unknown, __: unknown, index: number) => (
          <Typography.Text type="secondary">{index + 1}</Typography.Text>
        ),
      },
      {
        key: "line_kind",
        title: "Kind",
        width: 120,
        render: (_: unknown, __: unknown, index: number) => (
          <KindCell index={index} writable={writable} disabled={disabled} />
        ),
      },
      {
        key: "description",
        title: "Description",
        render: (_: unknown, __: unknown, index: number) => (
          <DescriptionCell index={index} writable={writable} disabled={disabled} />
        ),
      },
      {
        key: "quantity",
        title: "Qty",
        width: 90,
        render: (_: unknown, __: unknown, index: number) => (
          <QuantityCell index={index} writable={writable} disabled={disabled} />
        ),
      },
      {
        key: "unit",
        title: "Unit",
        width: 80,
        render: (_: unknown, __: unknown, index: number) => (
          <UnitCell index={index} writable={writable} disabled={disabled} />
        ),
      },
      {
        key: "unit_cost",
        title: "Cost",
        width: 120,
        render: (_: unknown, __: unknown, index: number) => (
          <MoneyCell index={index} field="unit_cost" writable={writable} disabled={disabled} />
        ),
      },
      {
        key: "unit_price",
        title: "Sell",
        width: 120,
        render: (_: unknown, __: unknown, index: number) => (
          <MoneyCell index={index} field="unit_price" writable={writable} disabled={disabled} />
        ),
      },
      {
        key: "_ext_sell",
        title: "Ext sell",
        width: 100,
        render: (_: unknown, __: unknown, index: number) => <ExtSellCell index={index} />,
      },
      ...(writable || allowRemove
        ? [
            {
              key: "_actions",
              title: "",
              width: 80,
              render: (_: unknown, __: unknown, index: number) => (
                <RowActions
                  index={index}
                  disabled={disabled}
                  writable={writable}
                  allowRemove={allowRemove}
                  onAddComponent={addComponent}
                  onRemove={removeLine}
                />
              ),
            },
          ]
        : []),
    ],
    [addComponent, allowRemove, disabled, removeLine, writable],
  );

  const dataSource = fields.map((row, index) => ({ key: row.id, index }));

  const tableColumns = columns.map((column) => ({
    ...column,
    render: (_value: unknown, record: { index: number }) =>
      column.render(_value, record, record.index),
  }));

  return (
    <FormSection title="Line items">
      <Table
        columns={tableColumns}
        dataSource={dataSource}
        rowKey="key"
        pagination={false}
        size="small"
        scroll={{ x: true }}
        locale={{ emptyText: "No lines" }}
      />
      {writable ? (
        <Space style={{ marginTop: 12 }}>
          <Button icon={<PlusOutlined />} disabled={disabled} onClick={addLine}>
            Add line
          </Button>
          <Button disabled={disabled} onClick={addKit}>
            Add kit (header + component)
          </Button>
        </Space>
      ) : null}
      <TotalSellFooter />
    </FormSection>
  );
};

type RowActionsProps = {
  index: number;
  disabled: boolean;
  writable: boolean;
  allowRemove: boolean;
  onAddComponent: (index: number) => void;
  onRemove: (index: number) => void;
};

const RowActions = ({
  index,
  disabled,
  writable,
  allowRemove,
  onAddComponent,
  onRemove,
}: RowActionsProps) => {
  const role = useWatch({
    name: lineFieldPath(index, "line_role"),
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
          onClick={() => onAddComponent(index)}
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
          onClick={() => onRemove(index)}
        />
      ) : null}
    </Space>
  );
};
