"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { surfaceAllows, type Manifest } from "@latch/contracts";
import {
  Alert,
  App,
  Button,
  Collapse,
  Input,
  InputNumber,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useCallback, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";

import {
  createKitBundle,
  createStandaloneLine,
  DEMO_ESTIMATE,
  extSell,
  ITEM_OPTIONS,
  locationLabel,
  PART_OPTIONS,
  PHASE_OPTIONS,
  type EstimateLineRow,
  type EstimateSpikeFixture,
  type LineEditorMode,
  type LineKind,
} from "@/components/estimates/estimate-spike-fixtures";
import { FormSection } from "@/components/form/FormSection";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";

type EstimateSpikeFormValues = {
  line_items: EstimateLineRow[];
  profile: {
    title: string;
  };
};

const lineFieldPath = (
  index: number,
  key?: keyof EstimateLineRow,
): FieldPath<EstimateSpikeFormValues> =>
  (key ? `line_items.${index}.${key}` : `line_items.${index}`) as FieldPath<EstimateSpikeFormValues>;

type EstimateLineEditorSpikeProps = {
  estimate: EstimateSpikeFixture;
  manifest: Manifest;
};

const LINE_KIND_OPTIONS = [
  { value: "product", label: "Product" },
  { value: "labor", label: "Labor" },
  { value: "expense", label: "Expense" },
] satisfies Array<{ value: LineKind; label: string }>;

const roleTag = (role: EstimateLineRow["line_role"]) => {
  if (role === "kit_header") {
    return <Tag color="blue">Kit</Tag>;
  }
  if (role === "kit_component") {
    return <Tag>Component</Tag>;
  }
  return null;
};

const descriptionIndent = (role: EstimateLineRow["line_role"]): number =>
  role === "kit_component" ? 24 : 0;

type LineCellProps = {
  index: number;
  writable: boolean;
  disabled: boolean;
  locations: EstimateSpikeFixture["site_locations"];
  showLocationColumn: boolean;
};

const LineKindCell = ({ index, writable, disabled }: LineCellProps) => (
  <Controller<EstimateSpikeFormValues>
    name={lineFieldPath(index, "line_kind")}
    render={({ field: { value, onChange } }) => {
      const kind = value as LineKind;

      return writable ? (
        <Select
          size="small"
          style={{ width: "100%" }}
          options={LINE_KIND_OPTIONS}
          value={kind}
          onChange={onChange}
          disabled={disabled}
        />
      ) : (
        <Typography.Text>{kind}</Typography.Text>
      );
    }}
  />
);

const DescriptionCell = ({ index, writable, disabled }: LineCellProps) => (
  <Controller<EstimateSpikeFormValues>
    name={lineFieldPath(index)}
    render={({ field: { value, onChange } }) => {
      const row = value as EstimateLineRow;
      const text = row.description;

      return (
        <Space size={4}>
          {roleTag(row.line_role)}
          {writable ? (
            <Input
              size="small"
              value={text}
              disabled={disabled}
              style={{ paddingLeft: descriptionIndent(row.line_role) }}
              onChange={(event) =>
                onChange({ ...row, description: event.target.value })
              }
            />
          ) : (
            <Typography.Text style={{ paddingLeft: descriptionIndent(row.line_role) }}>
              {text}
            </Typography.Text>
          )}
        </Space>
      );
    }}
  />
);

const PartCell = ({ index, writable, disabled }: LineCellProps) => (
  <Controller<EstimateSpikeFormValues>
    name={lineFieldPath(index)}
    render={({ field: { value, onChange } }) => {
      const row = value as EstimateLineRow;
      if (row.line_kind === "labor") {
        return <Typography.Text type="secondary">—</Typography.Text>;
      }

      return writable ? (
        <Select
          allowClear
          size="small"
          style={{ width: "100%" }}
          placeholder="Part"
          options={[...PART_OPTIONS]}
          value={row.part_id}
          disabled={disabled}
          onChange={(partId) => onChange({ ...row, part_id: partId ?? null })}
        />
      ) : (
        <Typography.Text>
          {PART_OPTIONS.find((option) => option.value === row.part_id)?.label ?? "—"}
        </Typography.Text>
      );
    }}
  />
);

const PhaseCell = ({ index, writable, disabled }: LineCellProps) => (
  <Controller<EstimateSpikeFormValues>
    name={lineFieldPath(index)}
    render={({ field: { value, onChange } }) => {
      const row = value as EstimateLineRow;
      if (row.line_kind !== "labor") {
        return <Typography.Text type="secondary">—</Typography.Text>;
      }

      return writable ? (
        <Select
          allowClear
          size="small"
          style={{ width: "100%" }}
          placeholder="Phase"
          options={[...PHASE_OPTIONS]}
          value={row.phase_id}
          disabled={disabled}
          onChange={(phaseId) => onChange({ ...row, phase_id: phaseId ?? null })}
        />
      ) : (
        <Typography.Text>
          {PHASE_OPTIONS.find((option) => option.value === row.phase_id)?.label ?? "—"}
        </Typography.Text>
      );
    }}
  />
);

const QuantityCell = ({ index, writable, disabled }: LineCellProps) => (
  <Controller<EstimateSpikeFormValues>
    name={lineFieldPath(index, "quantity")}
    render={({ field: { value, onChange } }) => {
      const quantity = Number(value);

      return writable ? (
        <InputNumber
          size="small"
          min={0}
          value={quantity}
          disabled={disabled}
          onChange={(next) => onChange(next ?? 0)}
        />
      ) : (
        <Typography.Text>{quantity}</Typography.Text>
      );
    }}
  />
);

const UnitCell = ({ index, writable, disabled }: LineCellProps) => (
  <Controller<EstimateSpikeFormValues>
    name={lineFieldPath(index, "unit")}
    render={({ field: { value, onChange, onBlur } }) => {
      const unit = String(value ?? "");

      return writable ? (
        <Input
          size="small"
          value={unit}
          disabled={disabled}
          onChange={onChange}
          onBlur={onBlur}
        />
      ) : (
        <Typography.Text>{unit}</Typography.Text>
      );
    }}
  />
);

const MoneyCell = ({
  index,
  field,
  writable,
  disabled,
}: LineCellProps & { field: "unit_cost" | "unit_price" }) => (
  <Controller<EstimateSpikeFormValues>
    name={lineFieldPath(index, field)}
    render={({ field: { value, onChange } }) => {
      const amount = Number(value);

      return writable ? (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          prefix="$"
          value={amount}
          disabled={disabled}
          onChange={(next) => onChange(next ?? 0)}
        />
      ) : (
        <Typography.Text>${amount.toFixed(2)}</Typography.Text>
      );
    }}
  />
);

const ExtSellCell = ({ index }: Pick<LineCellProps, "index">) => {
  const row = useWatch({
    name: lineFieldPath(index),
  }) as EstimateLineRow | undefined;

  if (!row) {
    return null;
  }

  return <Typography.Text>${extSell(row).toFixed(2)}</Typography.Text>;
};

const LocationCell = ({ index, writable, disabled, locations }: LineCellProps) => (
  <Controller<EstimateSpikeFormValues>
    name={lineFieldPath(index, "site_location_id")}
    render={({ field: { value, onChange } }) => {
      const locationId = (value as string | null | undefined) ?? null;

      return writable ? (
        <Select
          allowClear
          size="small"
          style={{ width: "100%" }}
          placeholder="Location"
          options={locations.map((location) => ({
            value: location.id,
            label: location.name,
          }))}
          value={locationId}
          disabled={disabled}
          onChange={(next) => onChange(next ?? null)}
        />
      ) : (
        <Typography.Text>{locationLabel(locations, locationId)}</Typography.Text>
      );
    }}
  />
);

const buildColumns = (
  locations: EstimateSpikeFixture["site_locations"],
  showLocationColumn: boolean,
) => {
  const cellProps = (index: number, writable: boolean, disabled: boolean): LineCellProps => ({
    index,
    writable,
    disabled,
    locations,
    showLocationColumn,
  });

  const columns = [
    {
      key: "line_number",
      title: "#",
      width: 48,
      render: (_: unknown, __: unknown, index: number) => (
        <Controller<EstimateSpikeFormValues>
          name={lineFieldPath(index, "line_number")}
          render={({ field: { value } }) => (
            <Typography.Text>{Number(value)}</Typography.Text>
          )}
        />
      ),
    },
    {
      key: "line_kind",
      title: "Kind",
      width: 110,
      render: (_: unknown, __: unknown, index: number, writable = true, disabled = false) => (
        <LineKindCell {...cellProps(index, writable, disabled)} />
      ),
    },
    {
      key: "description",
      title: "Description",
      render: (_: unknown, __: unknown, index: number, writable = true, disabled = false) => (
        <DescriptionCell {...cellProps(index, writable, disabled)} />
      ),
    },
    {
      key: "part_id",
      title: "Part",
      width: 220,
      render: (_: unknown, __: unknown, index: number, writable = true, disabled = false) => (
        <PartCell {...cellProps(index, writable, disabled)} />
      ),
    },
    {
      key: "phase_id",
      title: "Phase",
      width: 130,
      render: (_: unknown, __: unknown, index: number, writable = true, disabled = false) => (
        <PhaseCell {...cellProps(index, writable, disabled)} />
      ),
    },
    {
      key: "quantity",
      title: "Qty",
      width: 88,
      render: (_: unknown, __: unknown, index: number, writable = true, disabled = false) => (
        <QuantityCell {...cellProps(index, writable, disabled)} />
      ),
    },
    {
      key: "unit",
      title: "Unit",
      width: 72,
      render: (_: unknown, __: unknown, index: number, writable = true, disabled = false) => (
        <UnitCell {...cellProps(index, writable, disabled)} />
      ),
    },
    {
      key: "unit_cost",
      title: "Cost",
      width: 104,
      render: (_: unknown, __: unknown, index: number, writable = true, disabled = false) => (
        <MoneyCell {...cellProps(index, writable, disabled)} field="unit_cost" />
      ),
    },
    {
      key: "unit_price",
      title: "Sell",
      width: 104,
      render: (_: unknown, __: unknown, index: number, writable = true, disabled = false) => (
        <MoneyCell {...cellProps(index, writable, disabled)} field="unit_price" />
      ),
    },
    {
      key: "ext_sell",
      title: "Ext sell",
      width: 96,
      render: (_: unknown, __: unknown, index: number) => <ExtSellCell index={index} />,
    },
  ];

  if (showLocationColumn) {
    columns.splice(3, 0, {
      key: "site_location_id",
      title: "Location",
      width: 200,
      render: (_: unknown, __: unknown, index: number, writable = true, disabled = false) => (
        <LocationCell {...cellProps(index, writable, disabled)} />
      ),
    });
  }

  return columns;
};

type LineTableProps = {
  indices: number[];
  locations: EstimateSpikeFixture["site_locations"];
  showLocationColumn: boolean;
  writable: boolean;
  disabled: boolean;
  onRemove: (index: number) => void;
  allowRemove: boolean;
};

const LineTable = ({
  indices,
  locations,
  showLocationColumn,
  writable,
  disabled,
  onRemove,
  allowRemove,
}: LineTableProps) => {
  const columns = useMemo(
    () => buildColumns(locations, showLocationColumn),
    [locations, showLocationColumn],
  );

  const dataSource = indices.map((index) => ({ key: String(index), index }));

  const tableColumns = [
    ...columns.map((column) => ({
      ...column,
      render: (_: unknown, record: { index: number }) =>
        column.render(_, record, record.index, writable, disabled),
    })),
    ...(allowRemove
      ? [
          {
            key: "_actions",
            title: "",
            width: 48,
            render: (_: unknown, record: { index: number }) => (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label="Remove row"
                disabled={disabled}
                onClick={() => onRemove(record.index)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Table
      columns={tableColumns}
      dataSource={dataSource}
      rowKey="key"
      pagination={false}
      size="small"
      scroll={{ x: true }}
    />
  );
};

export const EstimateLineEditorSpike = ({
  estimate = DEMO_ESTIMATE,
  manifest,
}: EstimateLineEditorSpikeProps) => {
  const { message } = App.useApp();
  const [editorMode, setEditorMode] = useState<LineEditorMode>("flat");
  const [savePending, setSavePending] = useState(false);

  const defaultValues = useMemo<EstimateSpikeFormValues>(
    () => ({
      profile: { title: estimate.title },
      line_items: estimate.line_items.map((row) => ({ ...row })),
    }),
    [estimate],
  );

  const form = useForm<EstimateSpikeFormValues>({ defaultValues });
  const { control, reset, formState, handleSubmit } = form;
  const { fields, append } = useFieldArray({ control, name: "line_items" });
  const watchedLines = useWatch({ control, name: "line_items" }) ?? defaultValues.line_items;

  const canWrite = surfaceAllows(manifest, "write");
  const canDelete = surfaceAllows(manifest, "delete");
  const saving = savePending;
  const dirty = formState.isDirty;

  const reindexLines = useCallback((lines: EstimateLineRow[]): EstimateLineRow[] => {
    return lines.map((row, index) => ({
      ...row,
      sort_order: index + 1,
      line_number: index + 1,
    }));
  }, []);

  const removeLine = useCallback(
    (index: number) => {
      const row = watchedLines[index];
      if (!row) {
        return;
      }

      const idsToRemove = new Set<string>();
      const rowKey = row.id ?? row.client_key;
      if (rowKey) {
        idsToRemove.add(rowKey);
      }

      if (row.line_role === "kit_header" && rowKey) {
        watchedLines.forEach((line) => {
          if (line.parent_line_id === rowKey) {
            const childKey = line.id ?? line.client_key;
            if (childKey) {
              idsToRemove.add(childKey);
            }
          }
        });
      }

      const next = watchedLines.filter((line) => {
        const key = line.id ?? line.client_key;
        return !key || !idsToRemove.has(key);
      });

      form.setValue("line_items", reindexLines(next), { shouldDirty: true });
    },
    [form, reindexLines, watchedLines],
  );

  const addLine = useCallback(
    (siteLocationId: string | null = null) => {
      append(createStandaloneLine(watchedLines, { site_location_id: siteLocationId }));
    },
    [append, watchedLines],
  );

  const addKit = useCallback(
    (siteLocationId: string | null = null) => {
      createKitBundle(watchedLines, siteLocationId).forEach((row) => append(row));
    },
    [append, watchedLines],
  );

  const submit = handleSubmit(async (values) => {
    setSavePending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      console.info("[estimate-spike] save payload", values);
      reset(values);
      message.success(`Saved ${values.line_items.length} lines (fixture — no API)`);
    } finally {
      setSavePending(false);
    }
  });

  const onRevert = () => {
    reset(defaultValues);
    message.info("Reverted to fixture");
  };

  const toolbarActions = useMemo(
    () => [
      {
        key: "save",
        label: "Save",
        priority: "primary" as const,
        surfaceAction: "write" as const,
        disabled: !canWrite || !dirty,
        loading: saving,
        onClick: submit,
      },
      {
        key: "revert",
        label: "Revert",
        priority: "secondary" as const,
        surfaceAction: "write" as const,
        disabled: !dirty || saving,
        onClick: onRevert,
      },
    ],
    [canWrite, dirty, onRevert, saving, submit],
  );

  useRegisterSurfaceActions(manifest, toolbarActions);

  const locationGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string; indices: number[] }> = [
      { key: "unassigned", label: "Unassigned", indices: [] },
      ...estimate.site_locations.map((location) => ({
        key: location.id,
        label: location.name,
        indices: [] as number[],
      })),
    ];

    watchedLines.forEach((row, index) => {
      const groupKey = row.site_location_id ?? "unassigned";
      const group = groups.find((entry) => entry.key === groupKey) ?? groups[0];
      group.indices.push(index);
    });

    return groups.filter((group) => group.indices.length > 0);
  }, [estimate.site_locations, watchedLines]);

  const flatIndices = useMemo(
    () =>
      fields
        .map((_, index) => index)
        .sort((left, right) => {
          const a = watchedLines[left]?.sort_order ?? left;
          const b = watchedLines[right]?.sort_order ?? right;
          return a - b;
        }),
    [fields, watchedLines],
  );

  const totalSell = watchedLines.reduce((sum, row) => sum + extSell(row), 0);

  return (
    <SurfaceFormRoot
      manifest={manifest}
      loading={false}
      blocking={saving}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
    >
      <form onSubmit={submit}>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            title="Superseded fixture spike — use /estimates"
            description="Task 20 step 3 fixture DTO (no DAL/API). Production estimate editor shipped in wave 4a — see /estimates. Kept dev-only as the grouped-by-place reference for wave 4c. Spike notes: apps/subhub/docs/spikes/estimate-line-editor.md"
          />

          <FormSection title="Quote">
            <SurfaceFormLayout>
              <Typography.Paragraph style={{ marginBottom: 8 }}>
                <Typography.Text strong>{estimate.title}</Typography.Text>
                <br />
                <Typography.Text type="secondary">
                  {estimate.site_name} · {estimate.estimate_date}
                </Typography.Text>
              </Typography.Paragraph>
            </SurfaceFormLayout>
          </FormSection>

          <FormSection title="Line editor mode">
            <Segmented
              value={editorMode}
              onChange={(value) => setEditorMode(value as LineEditorMode)}
              options={[
                { label: "Flat grid", value: "flat" },
                { label: "Grouped by location", value: "grouped" },
              ]}
            />
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              Same <code>line_items</code> array — grouped view is a location-keyed shell over flat
              rows (O3 estimate line grouping).
            </Typography.Paragraph>
          </FormSection>

          <FormSection title="Line items" width="full">
            {editorMode === "flat" ? (
              <>
                <LineTable
                  indices={flatIndices}
                  locations={estimate.site_locations}
                  showLocationColumn
                  writable={canWrite}
                  disabled={saving}
                  onRemove={removeLine}
                  allowRemove={canDelete}
                />
                {canWrite ? (
                  <Space style={{ marginTop: 12 }}>
                    <Button icon={<PlusOutlined />} onClick={() => addLine()}>
                      Add line
                    </Button>
                    <Button onClick={() => addKit()}>Add kit (header + components)</Button>
                  </Space>
                ) : null}
              </>
            ) : (
              <Collapse
                defaultActiveKey={locationGroups.map((group) => group.key)}
                items={locationGroups.map((group) => ({
                  key: group.key,
                  label: (
                    <Space>
                      <Typography.Text strong>{group.label}</Typography.Text>
                      <Typography.Text type="secondary">
                        ({group.indices.length} lines)
                      </Typography.Text>
                    </Space>
                  ),
                  children: (
                    <>
                      <LineTable
                        indices={group.indices}
                        locations={estimate.site_locations}
                        showLocationColumn={false}
                        writable={canWrite}
                        disabled={saving}
                        onRemove={removeLine}
                        allowRemove={canDelete}
                      />
                      {canWrite ? (
                        <Space style={{ marginTop: 12 }}>
                          <Button
                            icon={<PlusOutlined />}
                            onClick={() =>
                              addLine(group.key === "unassigned" ? null : group.key)
                            }
                          >
                            Add line
                          </Button>
                          <Button
                            onClick={() =>
                              addKit(group.key === "unassigned" ? null : group.key)
                            }
                          >
                            Add kit
                          </Button>
                        </Space>
                      ) : null}
                    </>
                  ),
                }))}
              />
            )}

            <Typography.Paragraph style={{ marginTop: 16, textAlign: "right" }}>
              <Typography.Text strong>Total sell: </Typography.Text>
              <Typography.Text>${totalSell.toFixed(2)}</Typography.Text>
            </Typography.Paragraph>
          </FormSection>

          <FormSection title="Item picker (deferred)">
            <Typography.Paragraph type="secondary">
              Static catalog stand-ins — wave 3 will wire <code>item_id</code> /{" "}
              <code>part_id</code> pickers. Sample item labels:{" "}
              {ITEM_OPTIONS.slice(0, 3)
                .map((option) => option.label)
                .join("; ")}
              …
            </Typography.Paragraph>
          </FormSection>
      </form>
    </SurfaceFormRoot>
  );
};
