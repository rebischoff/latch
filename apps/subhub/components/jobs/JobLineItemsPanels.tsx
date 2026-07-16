"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import {
  App,
  Button,
  InputNumber,
  Select,
  Space,
  Table,
  Tree,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import type { EstimateSiteTreeFormRow } from "@/components/estimates/estimate-line-tree";
import { JobConditionConfigPanel } from "@/components/jobs/JobConditionConfigPanel";
import { JobLineZoneButton } from "@/components/jobs/JobLineZoneButton";
import {
  buildJobConditionDraft,
  isFrozenSoldLine,
  type JobConditionFormRow,
  type JobLineFormRow,
  type JobScopeFormValues,
} from "@/components/jobs/job-scope-tree";
import { useFormUi } from "@/components/surface/useFormUi";
import { useFilteredPartAutofill } from "@/lib/hooks/use-filtered-part-autofill";
import { useJobPartPicker } from "@/lib/hooks/use-job-part-picker";
import { fetchEstimateSiteTree } from "@/lib/surface-api";

type JobLineItemsPanelsProps = {
  manifest: Manifest;
  siteId?: string;
};

const currency = (value: number): string =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD" });

type ConditionTreeNode = {
  key: string;
  title: string;
  children?: ConditionTreeNode[];
};

const toTreeNodes = (rows: JobConditionFormRow[]): ConditionTreeNode[] =>
  rows.map((row) => ({
    key: row.id,
    title: row.site_zone_name ? `${row.name} — ${row.site_zone_name}` : row.name,
    children:
      row.conditions.length > 0 ? toTreeNodes(row.conditions) : undefined,
  }));

type JobPartSelectProps = {
  conditions: JobConditionFormRow[];
  disabled: boolean;
  line: JobLineFormRow;
  onChange: (patch: Partial<JobLineFormRow>) => void;
  writable: boolean;
};

const JobPartSelect = ({
  conditions,
  disabled,
  line,
  onChange,
  writable,
}: JobPartSelectProps) => {
  const draft = line.job_condition_id
    ? buildJobConditionDraft(conditions, line.job_condition_id)
    : undefined;

  const { data: parts, isLoading } = useJobPartPicker(
    line.item_id,
    line.job_condition_id,
    Boolean(line.item_id && line.job_condition_id && writable),
    draft,
  );

  const filteredOptions = (parts ?? []).map((part) => ({
    value: part.id,
    label: part.mpn,
  }));

  const onAdoptPart = useCallback(
    (part: { value: string; label: string }) => {
      onChange({
        part_id: part.value,
        part_mpn: part.label,
        // Suggested match — do not material-lock.
        material_locked: false,
      });
    },
    [onChange],
  );

  const onClearPart = useCallback(() => {
    onChange({
      part_id: null,
      part_mpn: null,
      vendor_part_id: null,
    });
  }, [onChange]);

  useFilteredPartAutofill({
    enabled: writable && !disabled,
    itemId: line.item_id,
    partId: line.part_id,
    materialLocked: Boolean(line.material_locked),
    isLoading,
    options: filteredOptions,
    onAdopt: onAdoptPart,
    onClear: onClearPart,
  });

  if (!line.item_id) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  if (!writable) {
    return (
      <Typography.Text>{line.part_mpn ?? line.part_id ?? "—"}</Typography.Text>
    );
  }

  const options = [...filteredOptions];

  if (
    line.part_id &&
    line.part_mpn &&
    !options.some((option) => option.value === line.part_id)
  ) {
    options.unshift({ value: line.part_id, label: line.part_mpn });
  }

  const empty = !isLoading && filteredOptions.length === 0;

  return (
    <Select
      size="small"
      style={{ width: "100%" }}
      allowClear
      loading={isLoading}
      placeholder={empty ? "No match" : "Pick PN"}
      value={line.part_id ?? undefined}
      disabled={disabled || Boolean(line.material_locked)}
      options={options}
      onChange={(next) => {
        const partId = typeof next === "string" ? next : null;
        const matched = options.find((option) => option.value === partId);
        onChange({
          part_id: partId,
          part_mpn: matched?.label ?? null,
          material_locked: partId ? true : line.material_locked,
          vendor_part_id: partId ? line.vendor_part_id : null,
        });
      }}
    />
  );
};

export const JobLineItemsPanels = ({
  manifest,
  siteId,
}: JobLineItemsPanelsProps) => {
  const { control, setValue } = useFormContext<JobScopeFormValues>();
  const { message } = App.useApp();
  const { disabled } = useFormUi();

  const conditions = useWatch({ control, name: "conditions" }) ?? [];
  const lineItems = useWatch({ control, name: "line_items" }) ?? [];

  const writableLines = fieldAllows(manifest, "line_items", "write") && !disabled;
  const writableConditions = fieldAllows(manifest, "conditions", "write");

  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(
    null,
  );
  const [siteTree, setSiteTree] = useState<EstimateSiteTreeFormRow | null>(null);

  useEffect(() => {
    if (!selectedConditionId && conditions.length > 0) {
      setSelectedConditionId(conditions[0]!.id);
    }
  }, [conditions, selectedConditionId]);

  useEffect(() => {
    let active = true;
    if (!siteId) {
      setSiteTree(null);
      return;
    }
    void fetchEstimateSiteTree(siteId)
      .then((result) => {
        if (active) {
          setSiteTree(result.data.site_tree as EstimateSiteTreeFormRow);
        }
      })
      .catch(() => {
        if (active) {
          setSiteTree(null);
        }
      });
    return () => {
      active = false;
    };
  }, [siteId]);

  const treeData = useMemo(() => toTreeNodes(conditions), [conditions]);

  const visibleLines = useMemo(() => {
    if (!selectedConditionId) {
      return lineItems;
    }
    return lineItems.filter(
      (line) =>
        line.job_condition_id === selectedConditionId && line.status === "active",
    );
  }, [lineItems, selectedConditionId]);

  const commitLines = (next: JobLineFormRow[]) => {
    setValue("line_items", next, { shouldDirty: true });
  };

  const updateLine = (lineId: string, patch: Partial<JobLineFormRow>) => {
    commitLines(
      lineItems.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    );
  };

  const onAddLine = () => {
    if (!selectedConditionId) {
      message.warning("Select a condition to add a line.");
      return;
    }
    const newLine: JobLineFormRow = {
      id: crypto.randomUUID(),
      job_condition_id: selectedConditionId,
      line_role: "standalone",
      line_kind: "product",
      parent_line_id: null,
      description: "",
      quantity: 1,
      sold_quantity: 0,
      qty_manual: true,
      unit: "ea",
      unit_cost: 0,
      unit_price: 0,
      unit_material: 0,
      unit_labor: 0,
      unit_freight: 0,
      unit_incidental: 0,
      unit_price_target: null,
      sold_unit_price: 0,
      sold_unit_cost: 0,
      sold_unit_material: 0,
      sold_unit_labor: 0,
      sold_unit_freight: 0,
      sold_unit_incidental: 0,
      allocations: [],
      sales_locked: false,
      material_locked: false,
      item_id: null,
      item_name: null,
      part_id: null,
      part_mpn: null,
      vendor_part_id: null,
      source: "manual",
      status: "active",
      estimate_line_id: null,
    };
    commitLines([...lineItems, newLine]);
  };

  const onDeleteLine = (line: JobLineFormRow) => {
    if (isFrozenSoldLine(line)) {
      message.error(
        "This is a sold line — reduce it through a change order (coming in wave 5d).",
      );
      return;
    }
    commitLines(lineItems.filter((row) => row.id !== line.id));
  };

  const columns: ColumnsType<JobLineFormRow> = [
    {
      title: "Item",
      dataIndex: "item_name",
      width: 180,
      render: (_value, line) => (
        <Typography.Text>{line.item_name ?? "—"}</Typography.Text>
      ),
    },
    {
      title: "Part",
      dataIndex: "part_id",
      width: 140,
      render: (_value, line) => (
        <JobPartSelect
          conditions={conditions}
          disabled={disabled}
          line={line}
          writable={writableLines}
          onChange={(patch) => updateLine(line.id, patch)}
        />
      ),
    },
    {
      title: "",
      key: "zones",
      width: 44,
      render: (_value, line) =>
        writableLines ? (
          <JobLineZoneButton
            conditions={conditions}
            disabled={disabled}
            line={line}
            siteTree={siteTree}
            onChange={(patch) => updateLine(line.id, patch)}
          />
        ) : null,
    },
    {
      title: "Sold qty",
      dataIndex: "sold_quantity",
      width: 90,
      render: (value: number) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      width: 100,
      render: (_value, line) => {
        if (!writableLines) {
          return <Typography.Text>{line.quantity}</Typography.Text>;
        }
        return (
          <InputNumber
            min={0}
            size="small"
            style={{ width: "100%" }}
            value={line.quantity}
            onChange={(value) =>
              updateLine(line.id, {
                quantity: Number(value ?? 0),
                qty_manual: true,
                allocations: [],
              })
            }
          />
        );
      },
    },
    {
      title: "Sold unit $",
      dataIndex: "sold_unit_price",
      width: 110,
      render: (value: number) => currency(value),
    },
    {
      title: "Sold cost",
      dataIndex: "sold_unit_cost",
      width: 110,
      render: (value: number) => currency(value),
    },
    {
      title: "Current cost",
      dataIndex: "unit_cost",
      width: 110,
      render: (value: number) => currency(value),
    },
    {
      title: "Δ cost",
      key: "delta",
      width: 100,
      render: (_value, line) => {
        const delta = line.unit_cost - line.sold_unit_cost;
        return (
          <Typography.Text
            type={delta > 0 ? "danger" : undefined}
            style={{ color: delta < 0 ? "#389e0d" : undefined }}
          >
            {delta === 0 ? "—" : currency(delta)}
          </Typography.Text>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_value, line) =>
        writableLines ? (
          <Button
            size="small"
            danger
            disabled={isFrozenSoldLine(line)}
            onClick={() => onDeleteLine(line)}
          >
            Delete
          </Button>
        ) : null,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 480 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", maxHeight: 320 }}>
        <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          <Typography.Title level={5}>Conditions</Typography.Title>
          {treeData.length === 0 ? (
            <Typography.Paragraph type="secondary">
              No job conditions. Conditions are copied from the estimate on win.
            </Typography.Paragraph>
          ) : (
            <Tree
              treeData={treeData}
              selectedKeys={selectedConditionId ? [selectedConditionId] : []}
              defaultExpandAll
              onSelect={(keys) =>
                setSelectedConditionId(keys.length > 0 ? String(keys[0]) : null)
              }
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          <Typography.Title level={5}>Config</Typography.Title>
          <JobConditionConfigPanel
            conditions={conditions}
            disabled={disabled}
            selectedConditionId={selectedConditionId}
            writable={writableConditions}
          />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 8 }} align="center">
          <Typography.Title level={5} style={{ margin: 0 }}>
            Line items
          </Typography.Title>
          {writableLines ? (
            <Button size="small" onClick={onAddLine} disabled={!selectedConditionId}>
              Add line
            </Button>
          ) : null}
        </Space>
        <Table<JobLineFormRow>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={visibleLines}
          pagination={false}
          scroll={{ x: 1200 }}
          locale={{ emptyText: "No line items for this condition." }}
        />
      </div>
    </div>
  );
};
