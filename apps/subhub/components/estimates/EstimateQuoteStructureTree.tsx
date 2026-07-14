"use client";

import { DeleteOutlined, DownOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space, Tree, Typography, message } from "antd";
import type { MenuProps, TreeProps } from "antd";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import {
  addConditionUnder,
  addRootCondition,
  buildCommercialTree,
  removeConditionById,
  toAntdConditionTreeData,
  type EstimateConditionAntdTreeNode,
} from "@/components/estimates/estimate-scope-tree";
import type {
  EstimateConditionFormRow,
  EstimateLineEditorFormValues,
} from "@/components/estimates/estimate-line-tree";
import {
  conditionReferencedByLines,
  defaultBucketSelection,
  parseSelectionFromTreeKey,
  selectionToTreeKey,
  type EstimateBucketSelection,
} from "@/components/estimates/estimate-line-selection";
import { fetchEstimateScopeSpecTemplate } from "@/lib/surface-api";
import { useItemRootPicker } from "@/lib/hooks/use-item-root-picker";

type EstimateQuoteStructureTreeProps = {
  selection: EstimateBucketSelection | null;
  writable: boolean;
  disabled: boolean;
  onSelect: (selection: EstimateBucketSelection | null) => void;
};

export const EstimateQuoteStructureTree = ({
  selection,
  writable,
  disabled,
  onSelect,
}: EstimateQuoteStructureTreeProps) => {
  const { getValues, setValue } = useFormContext<EstimateLineEditorFormValues>();
  const conditions = useWatch({ name: "conditions" }) as
    | EstimateConditionFormRow[]
    | undefined;
  const lineItems = useWatch({ name: "line_items" }) as
    | EstimateLineEditorFormValues["line_items"]
    | undefined;

  const { data: rootPicker, isLoading: rootsLoading } = useItemRootPicker();
  const rootOptions = useMemo(
    () =>
      (rootPicker?.data.rows ?? []).map((row) => ({
        value: row.id,
        label: row.name,
      })),
    [rootPicker?.data.rows],
  );

  const treeData = useMemo(
    () => toAntdConditionTreeData(buildCommercialTree(conditions ?? [])),
    [conditions],
  );

  const selectedKeys = selection ? [selectionToTreeKey(selection)] : [];

  const onSelectTree: TreeProps<EstimateConditionAntdTreeNode>["onSelect"] = (
    keys,
    info,
  ) => {
    const key = String(keys[0] ?? info.node.key);
    if (!key) {
      onSelect(null);
      return;
    }

    onSelect(parseSelectionFromTreeKey(key));
  };

  const handleAddRoot: MenuProps["onClick"] = ({ key }) => {
    const root = rootOptions.find((opt) => opt.value === key);
    if (!root) {
      return;
    }

    void (async () => {
      let specTemplate: EstimateConditionFormRow["specs"] = [];
      try {
        const result = await fetchEstimateScopeSpecTemplate(root.value);
        specTemplate = result.data.specs.map((spec) => ({
          spec_def_id: spec.spec_def_id,
          def_display_name: spec.def_display_name,
          value_type: spec.value_type,
          spec_option_id: spec.spec_option_id,
          option_display_name: spec.option_display_name,
          value_number: spec.value_number,
          value_number_max: spec.value_number_max ?? null,
          value_boolean: spec.value_boolean,
          unit_symbol: spec.unit_symbol ?? null,
          to_canonical_factor: spec.to_canonical_factor ?? 1,
          decimal_places: spec.decimal_places ?? null,
          options: spec.options,
        }));
      } catch {
        message.error("Could not load specs for that catalog root");
        return;
      }

      const current =
        (getValues("conditions") as EstimateConditionFormRow[] | undefined) ?? [];
      const next = addRootCondition(
        current,
        root.value,
        root.label,
        specTemplate.map((spec) => ({ ...spec })),
      );
      setValue("conditions", next, { shouldDirty: true });
      const added = next[next.length - 1];
      if (added) {
        onSelect({ estimateConditionId: added.id });
      }
    })();
  };

  const handleAddCondition = () => {
    if (!selection) {
      message.info("Select a condition first");
      return;
    }
    const result = addConditionUnder(conditions ?? [], selection.estimateConditionId);
    if (!result) {
      return;
    }
    setValue("conditions", result.conditions, { shouldDirty: true });
    onSelect({ estimateConditionId: result.conditionId });
  };

  const handleDelete = () => {
    if (!selection) {
      return;
    }

    if (
      conditionReferencedByLines(
        lineItems ?? [],
        selection.estimateConditionId,
        conditions ?? [],
      )
    ) {
      message.error("Cannot delete condition while lines reference it or a descendant");
      return;
    }

    const next = removeConditionById(conditions ?? [], selection.estimateConditionId);
    setValue("conditions", next, { shouldDirty: true });
    onSelect(defaultBucketSelection(next));
  };

  const addRootMenu: MenuProps = {
    items: rootOptions.map((opt) => ({ key: opt.value, label: opt.label })),
    onClick: handleAddRoot,
  };

  return (
    <div>
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
        Structure
      </Typography.Text>
      {writable ? (
        <Space style={{ marginBottom: 8 }} wrap>
          <Dropdown menu={addRootMenu} disabled={disabled || rootsLoading}>
            <Button size="small" icon={<PlusOutlined />}>
              Add root <DownOutlined />
            </Button>
          </Dropdown>
          <Button
            size="small"
            icon={<PlusOutlined />}
            disabled={disabled || !selection}
            onClick={handleAddCondition}
          >
            Add condition
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={disabled || !selection}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Space>
      ) : null}
      {(conditions ?? []).length === 0 ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Add a root condition to start the commercial tree.
        </Typography.Paragraph>
      ) : (
        <Tree<EstimateConditionAntdTreeNode>
          treeData={treeData}
          selectedKeys={selectedKeys}
          onSelect={onSelectTree}
          defaultExpandAll
          blockNode
          showLine
        />
      )}
    </div>
  );
};
