"use client";

import { EnvironmentOutlined } from "@ant-design/icons";
import { Button, InputNumber, Modal, Space, Tree, Typography } from "antd";
import type { DataNode } from "antd/es/tree";
import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { lineFieldPath } from "@/components/estimates/estimate-line-cells";
import type {
  EstimateConditionFormRow,
  EstimateLineAllocationFormRow,
  EstimateLineEditorFormValues,
  EstimateSiteTreeFormRow,
} from "@/components/estimates/estimate-line-tree";
import { rootSiteZoneIdForCondition } from "@/components/estimates/estimate-line-tree";
import {
  allocationsFromCheckedLeaves,
  applyParentQty,
  cascadeCheck,
  checkedAndHalfKeys,
  checkedLeafIdsFromAllocations,
  leafIdsInSubtree,
  leafIdsUnderNode,
  normalizeExclusiveLine,
  quantityFromTreeMode,
  qtyByLeafFromAllocations,
  sumCheckedLeafQty,
  zoneNameMap,
  zoneSubtreeForRoot,
  type ZoneTreeNode,
} from "@/components/estimates/estimate-line-zone-tree";

type EstimateLineZoneButtonProps = {
  conditions: EstimateConditionFormRow[];
  disabled: boolean;
  estimateConditionId: string;
  index: number;
  siteTree: EstimateSiteTreeFormRow | null | undefined;
};

type DraftState = {
  checkedLeafIds: string[];
  qtyByLeaf: Record<string, number>;
};

const uniformQty = (
  leafIds: string[],
  qtyByLeaf: Record<string, number>,
): number | null => {
  if (leafIds.length === 0) {
    return null;
  }
  const first = qtyByLeaf[leafIds[0]!] ?? 1;
  for (const id of leafIds) {
    if ((qtyByLeaf[id] ?? 1) !== first) {
      return null;
    }
  }
  return first;
};

const toBaseTreeData = (node: ZoneTreeNode): DataNode => ({
  key: node.key,
  title: node.title,
  children: (node.children ?? []).map(toBaseTreeData),
});

export const EstimateLineZoneButton = ({
  conditions,
  disabled,
  estimateConditionId,
  index,
  siteTree,
}: EstimateLineZoneButtonProps) => {
  const { setValue, getValues } = useFormContext<EstimateLineEditorFormValues>();
  const allocations = (useWatch({
    name: lineFieldPath(index, "allocations"),
  }) ?? []) as EstimateLineAllocationFormRow[];

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    checkedLeafIds: [],
    qtyByLeaf: {},
  });

  const rootSiteZoneId = rootSiteZoneIdForCondition(estimateConditionId, conditions);

  const subtree = useMemo(
    () => zoneSubtreeForRoot(siteTree, rootSiteZoneId),
    [rootSiteZoneId, siteTree],
  );

  const leafIds = useMemo(() => leafIdsInSubtree(subtree), [subtree]);
  const leafSet = useMemo(() => new Set(leafIds), [leafIds]);
  const nameById = useMemo(() => zoneNameMap(subtree), [subtree]);
  const baseTreeData = useMemo(
    () => (subtree ? [toBaseTreeData(subtree)] : []),
    [subtree],
  );

  const openModal = () => {
    const line = getValues(`line_items.${index}`);
    const normalized = normalizeExclusiveLine(
      {
        qty_manual: line?.qty_manual === true,
        quantity: Number(line?.quantity ?? 1),
        allocations: (line?.allocations ?? []) as EstimateLineAllocationFormRow[],
      },
      leafSet,
    );

    if (normalized.allocations.length !== (line?.allocations?.length ?? 0)) {
      setValue(lineFieldPath(index, "allocations"), normalized.allocations, {
        shouldDirty: true,
      });
    }

    const checked = checkedLeafIdsFromAllocations(normalized.allocations, leafSet);
    const qtyByLeaf = qtyByLeafFromAllocations(normalized.allocations);
    for (const id of checked) {
      if (qtyByLeaf[id] == null) {
        qtyByLeaf[id] = 1;
      }
    }

    setDraft({ checkedLeafIds: checked, qtyByLeaf });
    setOpen(true);
  };

  const allocated = sumCheckedLeafQty(draft.checkedLeafIds, draft.qtyByLeaf);

  const handleCheck = (nodeId: string, checked: boolean) => {
    setDraft((prev) => {
      const checkedLeafIds = cascadeCheck(
        nodeId,
        checked,
        subtree,
        prev.checkedLeafIds,
      );
      const qtyByLeaf = { ...prev.qtyByLeaf };
      if (checked) {
        for (const id of checkedLeafIds) {
          if (qtyByLeaf[id] == null) {
            qtyByLeaf[id] = 1;
          }
        }
      }
      return { checkedLeafIds, qtyByLeaf };
    });
  };

  const handleLeafQty = (leafId: string, qty: number) => {
    setDraft((prev) => ({
      ...prev,
      qtyByLeaf: { ...prev.qtyByLeaf, [leafId]: qty },
    }));
  };

  const handleParentQty = (nodeId: string, qty: number) => {
    setDraft((prev) => {
      const under = leafIdsUnderNode(subtree, nodeId);
      const checkedUnder = prev.checkedLeafIds.filter((id) => under.includes(id));
      return {
        ...prev,
        qtyByLeaf: applyParentQty(checkedUnder, qty, prev.qtyByLeaf),
      };
    });
  };

  const handleSave = () => {
    const nextAllocations = allocationsFromCheckedLeaves(
      draft.checkedLeafIds,
      draft.qtyByLeaf,
      nameById,
    );
    const nextQty = quantityFromTreeMode(
      sumCheckedLeafQty(draft.checkedLeafIds, draft.qtyByLeaf),
    );

    setValue(lineFieldPath(index, "allocations"), nextAllocations, {
      shouldDirty: true,
    });
    setValue(lineFieldPath(index, "qty_manual"), false, { shouldDirty: true });
    setValue(lineFieldPath(index, "quantity"), nextQty, { shouldDirty: true });
    setOpen(false);
  };

  const { checked, halfChecked } = useMemo(
    () => checkedAndHalfKeys(subtree, draft.checkedLeafIds),
    [subtree, draft.checkedLeafIds],
  );

  const titleRender = (node: DataNode) => {
    const nodeId = String(node.key);
    const isLeaf = !(node.children && node.children.length > 0);
    const under = leafIdsUnderNode(subtree, nodeId);
    const checkedUnder = draft.checkedLeafIds.filter((id) => under.includes(id));
    const isCheckedLeaf = isLeaf && draft.checkedLeafIds.includes(nodeId);
    const showQty = isLeaf ? isCheckedLeaf : checkedUnder.length > 0;
    const qtyValue = isLeaf
      ? (draft.qtyByLeaf[nodeId] ?? 1)
      : uniformQty(checkedUnder, draft.qtyByLeaf);
    const label = typeof node.title === "string" ? node.title : nodeId;

    return (
      <Space size={8} onClick={(event) => event.stopPropagation()}>
        <span>{label}</span>
        {showQty ? (
          <InputNumber
            size="small"
            min={0.01}
            style={{ width: 72 }}
            value={qtyValue ?? undefined}
            placeholder={isLeaf ? undefined : "mixed"}
            onChange={(next) => {
              const n = Number(next ?? 1);
              if (!(n > 0)) {
                return;
              }
              if (isLeaf) {
                handleLeafQty(nodeId, n);
              } else {
                handleParentQty(nodeId, n);
              }
            }}
          />
        ) : null}
      </Space>
    );
  };

  return (
    <>
      <Button
        type="text"
        size="small"
        icon={<EnvironmentOutlined />}
        disabled={disabled}
        onClick={openModal}
        aria-label={
          allocations.length > 0
            ? `Zones (${allocations.length})`
            : "Zones"
        }
      />
      <Modal
        title="Zones"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        okText="Apply"
        destroyOnHidden
        width={480}
      >
        <Typography.Paragraph type="secondary">
          Check zones under this condition&apos;s root. Line quantity follows the
          allocated total. Editing Qty on the line clears places.
        </Typography.Paragraph>

        {subtree == null ? (
          <Typography.Text type="secondary">
            No zones under this condition&apos;s root.
          </Typography.Text>
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }} size="middle">
            <Tree
              checkable
              checkStrictly
              defaultExpandAll
              treeData={baseTreeData}
              titleRender={titleRender}
              checkedKeys={{ checked, halfChecked }}
              onCheck={(_keys, info) => {
                handleCheck(String(info.node.key), info.checked);
              }}
            />
            <Typography.Text>Allocated: {allocated}</Typography.Text>
          </Space>
        )}
      </Modal>
    </>
  );
};
