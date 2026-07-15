"use client";

import { DeleteOutlined, DownOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space, Tree, Typography, message } from "antd";
import type { MenuProps, TreeProps } from "antd";
import Link from "next/link";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

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
import {
  createEstimateProposedSiteZone,
  fetchEstimateScopeSpecTemplate,
  fetchEstimateSiteTree,
} from "@/lib/surface-api";
import { useEstimateSiteZonesPicker } from "@/lib/hooks/use-estimate-site-zones-picker";
import { useItemRootPicker } from "@/lib/hooks/use-item-root-picker";
import {
  estimateSiteTreeKey,
  estimateSiteZonesPickerKey,
} from "@/lib/hooks/surface-query-keys";

type EstimateQuoteStructureTreeProps = {
  selection: EstimateBucketSelection | null;
  siteId?: string;
  writable: boolean;
  disabled: boolean;
  onSelect: (selection: EstimateBucketSelection | null) => void;
};

const mapSpecTemplate = (
  specs: Awaited<ReturnType<typeof fetchEstimateScopeSpecTemplate>>["data"]["specs"],
): EstimateConditionFormRow["specs"] =>
  specs.map((spec) => ({
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

export const EstimateQuoteStructureTree = ({
  selection,
  siteId,
  writable,
  disabled,
  onSelect,
}: EstimateQuoteStructureTreeProps) => {
  const { getValues, setValue } = useFormContext<EstimateLineEditorFormValues>();
  const queryClient = useQueryClient();
  const conditions = useWatch({ name: "conditions" }) as
    | EstimateConditionFormRow[]
    | undefined;
  const lineItems = useWatch({ name: "line_items" }) as
    | EstimateLineEditorFormValues["line_items"]
    | undefined;

  const { data: zonePicker, isLoading: zonesLoading } =
    useEstimateSiteZonesPicker(siteId);
  const { data: rootPicker, isLoading: rootsLoading } = useItemRootPicker();

  const usedZoneIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of conditions ?? []) {
      if (row.site_zone_id) {
        ids.add(row.site_zone_id);
      }
    }
    return ids;
  }, [conditions]);

  const zoneOptions = useMemo(
    () =>
      (zonePicker?.data.rows ?? []).map((row) => ({
        value: row.id,
        label: row.name,
        rootItemId: row.root_item_id,
        rootItemName: row.root_item_name,
        disabled: usedZoneIds.has(row.id),
      })),
    [usedZoneIds, zonePicker?.data.rows],
  );

  const catalogRootOptions = useMemo(
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

  const attachRoot = async (input: {
    name: string;
    rootItemId: string;
    rootItemName?: string | null;
    siteZoneId: string;
    siteZoneName?: string | null;
  }) => {
    let specTemplate: EstimateConditionFormRow["specs"] = [];
    try {
      const result = await fetchEstimateScopeSpecTemplate(input.rootItemId);
      specTemplate = mapSpecTemplate(result.data.specs);
    } catch {
      message.error("Could not load specs for that catalog root");
      return;
    }

    const current =
      (getValues("conditions") as EstimateConditionFormRow[] | undefined) ?? [];
    if (current.some((row) => row.site_zone_id === input.siteZoneId)) {
      message.error("That site zone is already used as a root on this estimate");
      return;
    }

    const next = addRootCondition(current, {
      ...input,
      specTemplate,
    });
    setValue("conditions", next, { shouldDirty: true });

    if (siteId) {
      try {
        const tree = await fetchEstimateSiteTree(siteId);
        setValue(
          "site_tree",
          tree.data.site_tree as EstimateLineEditorFormValues["site_tree"],
          { shouldDirty: false },
        );
        await queryClient.invalidateQueries({ queryKey: estimateSiteTreeKey(siteId) });
        await queryClient.invalidateQueries({
          queryKey: estimateSiteZonesPickerKey(siteId),
        });
      } catch {
        // site_tree refresh is best-effort; condition is already attached
      }
    }

    const added = next[next.length - 1];
    if (added) {
      onSelect({ estimateConditionId: added.id });
    }
  };

  const handleAddRoot: MenuProps["onClick"] = ({ key }) => {
    const keyStr = String(key);
    if (keyStr.startsWith("zone:")) {
      const zoneId = keyStr.slice("zone:".length);
      const zone = zoneOptions.find((opt) => opt.value === zoneId);
      if (!zone || zone.disabled) {
        return;
      }
      void attachRoot({
        siteZoneId: zone.value,
        siteZoneName: zone.label,
        name: zone.label,
        rootItemId: zone.rootItemId,
        rootItemName: zone.rootItemName,
      });
      return;
    }

    if (keyStr.startsWith("new:")) {
      const rootItemId = keyStr.slice("new:".length);
      const catalogRoot = catalogRootOptions.find((opt) => opt.value === rootItemId);
      if (!catalogRoot || !siteId) {
        return;
      }
      void (async () => {
        try {
          const created = await createEstimateProposedSiteZone({
            site_id: siteId,
            root_item_id: catalogRoot.value,
            name: catalogRoot.label,
          });
          const row = created.data.row;
          await attachRoot({
            siteZoneId: row.id,
            siteZoneName: row.name,
            name: row.name,
            rootItemId: row.root_item_id,
            rootItemName: row.root_item_name,
          });
        } catch {
          message.error("Could not create a proposed site zone");
        }
      })();
    }
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

  const newRootChildren: MenuProps["items"] = catalogRootOptions.map((opt) => ({
    key: `new:${opt.value}`,
    label: opt.label,
  }));

  const addRootMenu: MenuProps = {
    items: [
      ...zoneOptions.map((opt) => ({
        key: `zone:${opt.value}`,
        label: opt.label,
        disabled: opt.disabled,
      })),
      ...(zoneOptions.length > 0 && catalogRootOptions.length > 0
        ? [{ type: "divider" as const }]
        : []),
      ...(catalogRootOptions.length > 0
        ? [
            {
              key: "new",
              label: "New…",
              children: newRootChildren,
            },
          ]
        : []),
    ],
    onClick: handleAddRoot,
  };

  const addRootDisabled =
    disabled ||
    zonesLoading ||
    rootsLoading ||
    !siteId ||
    (zoneOptions.length === 0 && catalogRootOptions.length === 0);

  return (
    <div>
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
        Structure
      </Typography.Text>
      {writable ? (
        <Space style={{ marginBottom: 8 }} wrap>
          <Dropdown menu={addRootMenu} disabled={addRootDisabled}>
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
      {!siteId ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Select a site on the General tab before adding roots.
        </Typography.Paragraph>
      ) : (conditions ?? []).length === 0 ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {zoneOptions.length === 0 && catalogRootOptions.length === 0 ? (
            <>
              No site zones or catalog roots available. Add scopes on the{" "}
              <Link href={`/sites/${siteId}`}>site</Link> first.
            </>
          ) : (
            "Add a root condition to start the commercial tree."
          )}
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
