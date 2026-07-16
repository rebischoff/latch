"use client";

import { EnvironmentOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, InputNumber, Modal, Space, Tree, Typography } from "antd";
import type { DataNode } from "antd/es/tree";
import { useMemo, useState } from "react";

import type { EstimateSiteTreeFormRow } from "@/components/estimates/estimate-line-tree";
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
import {
  placesMismatchWorkingQty,
  rootSiteZoneIdForJobCondition,
  type JobConditionFormRow,
  type JobLineFormRow,
} from "@/components/jobs/job-scope-tree";

type JobLineZoneButtonProps = {
  conditions: JobConditionFormRow[];
  disabled: boolean;
  line: JobLineFormRow;
  onChange: (patch: Partial<JobLineFormRow>) => void;
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

/**
 * Job Scope zone icon + modal (task 47 JLI-6). Reuses estimate zone-tree helpers;
 * danger when places don't cover working qty. Always updates working `quantity`
 * (never sold_quantity).
 */
export const JobLineZoneButton = ({
  conditions,
  disabled,
  line,
  onChange,
  siteTree,
}: JobLineZoneButtonProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    checkedLeafIds: [],
    qtyByLeaf: {},
  });

  const rootSiteZoneId = line.job_condition_id
    ? rootSiteZoneIdForJobCondition(line.job_condition_id, conditions)
    : null;

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

  const danger = placesMismatchWorkingQty(line.quantity, line.allocations);

  const openModal = () => {
    const normalized = normalizeExclusiveLine(
      {
        qty_manual: line.qty_manual,
        quantity: line.quantity,
        allocations: line.allocations,
      },
      leafSet,
    );

    if (normalized.allocations.length !== line.allocations.length) {
      onChange({ allocations: normalized.allocations });
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

    onChange({
      allocations: nextAllocations,
      qty_manual: false,
      quantity: nextQty,
    });
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
        danger={danger}
        icon={danger ? <WarningOutlined /> : <EnvironmentOutlined />}
        disabled={disabled}
        onClick={openModal}
        aria-label={
          danger
            ? "Zones — places do not match qty"
            : line.allocations.length > 0
              ? `Zones (${line.allocations.length})`
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
          Check zones under this condition&apos;s root. Working quantity follows
          the allocated total (sold qty stays frozen).
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
