"use client";

import {
  Alert,
  Checkbox,
  Space,
  Table,
  Tag,
  Tree,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DataNode } from "antd/es/tree";
import { useCallback, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import {
  GENERAL_ZONE_KEY,
  siteZoneIdFromKey,
  type JobFieldProgressCell,
  type JobFieldProgressDto,
  type JobFieldProgressPhaseColumn,
  type JobFieldProgressWorkRow,
  type JobFieldProgressZoneNode,
  type JobFieldZoneOrderPatch,
  type JobFieldZoneOrderState,
} from "@/lib/jobs/repository/job-field-progress";

type CheckState = boolean | "indeterminate";

type PhaseTableRow = {
  checkedCount: number;
  key: string;
  label: string;
  leafCount: number;
  state: CheckState;
};

type WorkTableRow = JobFieldProgressWorkRow & {
  /** Prefer live Scope form part when draft/autofill differs from server board. */
  display_part_mpn: string | null;
};

type FieldProgressFormSlice = {
  field_progress?: JobFieldProgressCell[];
  field_zone_orders?: JobFieldZoneOrderPatch[];
  line_items?: Array<{
    id: string;
    part_mpn?: string | null;
  }>;
};

const findZoneNode = (
  nodes: JobFieldProgressZoneNode[],
  key: string,
): JobFieldProgressZoneNode | null => {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }
    if (node.children) {
      const found = findZoneNode(node.children, key);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const collectLeafKeys = (
  nodes: JobFieldProgressZoneNode[],
  rootKey: string,
): string[] => {
  const node = findZoneNode(nodes, rootKey);
  if (!node) {
    return [];
  }
  if (!node.children || node.children.length === 0) {
    return [node.key];
  }
  const leaves: string[] = [];
  const walk = (n: JobFieldProgressZoneNode) => {
    if (!n.children || n.children.length === 0) {
      leaves.push(n.key);
      return;
    }
    for (const child of n.children) {
      walk(child);
    }
  };
  walk(node);
  return leaves;
};

const collectSubtreeKeys = (
  nodes: JobFieldProgressZoneNode[],
  rootKey: string,
): Set<string> | null => {
  const node = findZoneNode(nodes, rootKey);
  if (!node) {
    return null;
  }
  const keys = new Set<string>([node.key]);
  const addChildren = (children?: JobFieldProgressZoneNode[]) => {
    for (const child of children ?? []) {
      keys.add(child.key);
      addChildren(child.children);
    }
  };
  addChildren(node.children);
  return keys;
};

const zoneTitleById = (
  nodes: JobFieldProgressZoneNode[],
  key: string,
): string => findZoneNode(nodes, key)?.title ?? key;

/** Parent nodes (has children) roll up place rows by item + part. */
const rollupWorkRowsByItemPart = (rows: WorkTableRow[]): WorkTableRow[] => {
  const byKey = new Map<string, WorkTableRow>();
  for (const row of rows) {
    const key = `${row.item}\0${row.display_part_mpn ?? ""}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...row,
        id: `rollup:${key}`,
        zone_key: row.zone_key,
        qty: row.qty,
        labor_phase_ids: [...row.labor_phase_ids],
      });
      continue;
    }
    existing.qty += row.qty;
    for (const phaseId of row.labor_phase_ids) {
      if (!existing.labor_phase_ids.includes(phaseId)) {
        existing.labor_phase_ids.push(phaseId);
      }
    }
  }
  return [...byKey.values()];
};

const leafLaborPhases = (
  workRows: JobFieldProgressWorkRow[],
  leafZoneKey: string,
): Set<string> => {
  const set = new Set<string>();
  for (const row of workRows) {
    if (row.zone_key === leafZoneKey) {
      for (const id of row.labor_phase_ids) {
        set.add(id);
      }
    }
  }
  return set;
};

const phasesForZone = (
  zoneKey: string,
  zoneTree: JobFieldProgressZoneNode[],
  workRows: JobFieldProgressWorkRow[],
  phases: JobFieldProgressPhaseColumn[],
): JobFieldProgressPhaseColumn[] => {
  const set = new Set<string>();
  for (const leaf of collectLeafKeys(zoneTree, zoneKey)) {
    for (const id of leafLaborPhases(workRows, leaf)) {
      set.add(id);
    }
  }
  return phases.filter((p) => set.has(p.labor_phase_id));
};

const leavesWithPhase = (
  zoneKey: string,
  laborPhaseId: string,
  zoneTree: JobFieldProgressZoneNode[],
  workRows: JobFieldProgressWorkRow[],
): string[] => {
  const leaves: string[] = [];
  for (const leaf of collectLeafKeys(zoneTree, zoneKey)) {
    if (leafLaborPhases(workRows, leaf).has(laborPhaseId)) {
      leaves.push(leaf);
    }
  }
  return leaves;
};

const leafPhaseComplete = (
  leafZoneKey: string,
  laborPhaseId: string,
  workRows: JobFieldProgressWorkRow[],
  cells: JobFieldProgressCell[],
  scopePhasesByLineLabor: Map<string, string[]>,
): boolean => {
  const scopePhaseIds = new Set<string>();
  for (const row of workRows) {
    if (row.zone_key !== leafZoneKey) {
      continue;
    }
    if (!row.labor_phase_ids.includes(laborPhaseId)) {
      continue;
    }
    for (const spId of scopePhasesByLineLabor.get(
      `${row.job_line_id}:${laborPhaseId}`,
    ) ?? []) {
      scopePhaseIds.add(spId);
    }
  }
  if (scopePhaseIds.size === 0) {
    return false;
  }
  const siteZoneId = leafZoneKey === GENERAL_ZONE_KEY ? null : leafZoneKey;
  for (const scopePhaseId of scopePhaseIds) {
    const cell = cells.find(
      (c) =>
        c.scope_phase_id === scopePhaseId &&
        (c.site_zone_id ?? null) === siteZoneId,
    );
    if (!cell?.complete) {
      return false;
    }
  }
  return true;
};

const deriveCheckState = (
  zoneKey: string,
  laborPhaseId: string,
  zoneTree: JobFieldProgressZoneNode[],
  workRows: JobFieldProgressWorkRow[],
  cells: JobFieldProgressCell[],
  scopePhasesByLineLabor: Map<string, string[]>,
): CheckState => {
  const leaves = leavesWithPhase(zoneKey, laborPhaseId, zoneTree, workRows);
  if (leaves.length === 0) {
    return false;
  }
  let checkedCount = 0;
  for (const leaf of leaves) {
    if (
      leafPhaseComplete(
        leaf,
        laborPhaseId,
        workRows,
        cells,
        scopePhasesByLineLabor,
      )
    ) {
      checkedCount += 1;
    }
  }
  if (checkedCount === 0) {
    return false;
  }
  if (checkedCount === leaves.length) {
    return true;
  }
  return "indeterminate";
};

const setLeafPhaseComplete = (
  leafZoneKey: string,
  laborPhaseId: string,
  checked: boolean,
  workRows: JobFieldProgressWorkRow[],
  cells: JobFieldProgressCell[],
  scopePhasesByLineLabor: Map<string, string[]>,
): JobFieldProgressCell[] => {
  const siteZoneId = leafZoneKey === GENERAL_ZONE_KEY ? null : leafZoneKey;
  const nextByKey = new Map(
    cells.map((c) => [
      `${c.scope_phase_id}:${c.site_zone_id ?? GENERAL_ZONE_KEY}`,
      { ...c },
    ]),
  );

  for (const row of workRows) {
    if (row.zone_key !== leafZoneKey) {
      continue;
    }
    if (!row.labor_phase_ids.includes(laborPhaseId)) {
      continue;
    }
    for (const scopePhaseId of scopePhasesByLineLabor.get(
      `${row.job_line_id}:${laborPhaseId}`,
    ) ?? []) {
      const key = `${scopePhaseId}:${leafZoneKey}`;
      nextByKey.set(key, {
        scope_phase_id: scopePhaseId,
        site_zone_id: siteZoneId,
        complete: checked,
      });
    }
  }

  return [...nextByKey.values()];
};

const deriveOrderCheckState = (
  zoneKey: string,
  zoneTree: JobFieldProgressZoneNode[],
  zoneOrders: Array<Pick<JobFieldZoneOrderState, "zone_key" | "ordered" | "locked">>,
): { state: CheckState; locked: boolean; leafCount: number; checkedCount: number } => {
  const leaves = collectLeafKeys(zoneTree, zoneKey);
  if (leaves.length === 0) {
    return { state: false, locked: false, leafCount: 0, checkedCount: 0 };
  }
  const byKey = new Map(zoneOrders.map((row) => [row.zone_key, row]));
  let checkedCount = 0;
  let locked = false;
  for (const leaf of leaves) {
    const row = byKey.get(leaf);
    if (row?.ordered) {
      checkedCount += 1;
    }
    if (row?.locked) {
      locked = true;
    }
  }
  if (checkedCount === 0) {
    return { state: false, locked, leafCount: leaves.length, checkedCount };
  }
  if (checkedCount === leaves.length) {
    return { state: true, locked, leafCount: leaves.length, checkedCount };
  }
  return {
    state: "indeterminate",
    locked,
    leafCount: leaves.length,
    checkedCount,
  };
};

type JobFieldProgressPanelsProps = {
  board: JobFieldProgressDto;
  readOnly?: boolean;
};

export const JobFieldProgressPanels = ({
  board,
  readOnly = false,
}: JobFieldProgressPanelsProps) => {
  const { setValue, control } = useFormContext<FieldProgressFormSlice>();
  const formCells = useWatch({ control, name: "field_progress" });
  const formZoneOrders = useWatch({ control, name: "field_zone_orders" });
  const formLineItems = useWatch({ control, name: "line_items" });
  const cells = formCells ?? board.cells;
  const zoneOrders: JobFieldZoneOrderState[] = useMemo(() => {
    const byKey = new Map(
      board.zone_orders.map((row) => [row.zone_key, { ...row }] as const),
    );
    for (const row of formZoneOrders ?? []) {
      const patch = row as JobFieldZoneOrderPatch;
      const zone_key =
        "zone_key" in row && typeof (row as JobFieldZoneOrderState).zone_key === "string"
          ? (row as JobFieldZoneOrderState).zone_key
          : patch.site_zone_id === null || patch.site_zone_id === undefined
            ? GENERAL_ZONE_KEY
            : patch.site_zone_id;
      const prior = byKey.get(zone_key);
      byKey.set(zone_key, {
        zone_key,
        site_zone_id: siteZoneIdFromKey(zone_key),
        ordered: patch.ordered,
        locked: prior?.locked ?? false,
      });
    }
    return [...byKey.values()];
  }, [board.zone_orders, formZoneOrders]);

  const partMpnByLineId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const line of formLineItems ?? []) {
      map.set(line.id, line.part_mpn ?? null);
    }
    return map;
  }, [formLineItems]);

  const [selectedZoneId, setSelectedZoneId] = useState<string>(() => {
    const root = board.zone_tree[0];
    if (!root) {
      return GENERAL_ZONE_KEY;
    }
    return root.children?.[0]?.key ?? root.key;
  });

  const scopePhasesByLineLabor = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of board.scope_phase_index) {
      const key = `${row.job_line_id}:${row.labor_phase_id}`;
      const list = map.get(key) ?? [];
      list.push(row.scope_phase_id);
      map.set(key, list);
    }
    return map;
  }, [board.scope_phase_index]);

  const setPhaseChecked = useCallback(
    (zoneId: string, laborPhaseId: string, checked: boolean) => {
      if (readOnly) {
        return;
      }
      const leaves = leavesWithPhase(
        zoneId,
        laborPhaseId,
        board.zone_tree,
        board.work_rows,
      );
      let next = [...cells];
      for (const leaf of leaves) {
        next = setLeafPhaseComplete(
          leaf,
          laborPhaseId,
          checked,
          board.work_rows,
          next,
          scopePhasesByLineLabor,
        );
      }
      setValue("field_progress", next, { shouldDirty: true });
    },
    [
      board.work_rows,
      board.zone_tree,
      cells,
      readOnly,
      scopePhasesByLineLabor,
      setValue,
    ],
  );

  const setOrderChecked = useCallback(
    (zoneId: string, checked: boolean) => {
      if (readOnly) {
        return;
      }
      const leaves = collectLeafKeys(board.zone_tree, zoneId);
      const byKey = new Map(zoneOrders.map((row) => [row.zone_key, row]));
      for (const leaf of leaves) {
        const prior = byKey.get(leaf);
        if (prior?.locked && !checked) {
          continue;
        }
        byKey.set(leaf, {
          zone_key: leaf,
          site_zone_id: siteZoneIdFromKey(leaf),
          ordered: checked,
          locked: prior?.locked ?? false,
        });
      }
      setValue(
        "field_zone_orders",
        [...byKey.values()].map((row) => ({
          site_zone_id: row.site_zone_id,
          ordered: row.ordered,
        })),
        { shouldDirty: true },
      );
    },
    [board.zone_tree, readOnly, setValue, zoneOrders],
  );

  const zoneScopeKeys = useMemo(
    () => collectSubtreeKeys(board.zone_tree, selectedZoneId),
    [board.zone_tree, selectedZoneId],
  );

  const filteredWorkRows = useMemo((): WorkTableRow[] => {
    const scoped = board.work_rows
      .filter((row) => {
        if (zoneScopeKeys && !zoneScopeKeys.has(row.zone_key)) {
          return false;
        }
        return true;
      })
      .map((row) => {
        const fromForm = partMpnByLineId.get(row.job_line_id);
        const display_part_mpn =
          fromForm !== undefined ? fromForm : row.part_mpn;
        return { ...row, display_part_mpn };
      });

    const selected = findZoneNode(board.zone_tree, selectedZoneId);
    const isParent = Boolean(selected?.children && selected.children.length > 0);
    return isParent ? rollupWorkRowsByItemPart(scoped) : scoped;
  }, [
    board.work_rows,
    board.zone_tree,
    partMpnByLineId,
    selectedZoneId,
    zoneScopeKeys,
  ]);

  const phaseRows = useMemo((): PhaseTableRow[] => {
    return phasesForZone(
      selectedZoneId,
      board.zone_tree,
      board.work_rows,
      board.phases,
    ).map((phase) => {
      const leaves = leavesWithPhase(
        selectedZoneId,
        phase.labor_phase_id,
        board.zone_tree,
        board.work_rows,
      );
      const state = deriveCheckState(
        selectedZoneId,
        phase.labor_phase_id,
        board.zone_tree,
        board.work_rows,
        cells,
        scopePhasesByLineLabor,
      );
      const checkedCount = leaves.filter((leaf) =>
        leafPhaseComplete(
          leaf,
          phase.labor_phase_id,
          board.work_rows,
          cells,
          scopePhasesByLineLabor,
        ),
      ).length;
      return {
        key: phase.labor_phase_id,
        label: phase.name,
        state,
        leafCount: leaves.length,
        checkedCount,
      };
    });
  }, [
    board.phases,
    board.work_rows,
    board.zone_tree,
    cells,
    scopePhasesByLineLabor,
    selectedZoneId,
  ]);

  const orderState = useMemo(
    () => deriveOrderCheckState(selectedZoneId, board.zone_tree, zoneOrders),
    [board.zone_tree, selectedZoneId, zoneOrders],
  );

  const treeData = useMemo((): DataNode[] => {
    const decorate = (nodes: JobFieldProgressZoneNode[]): DataNode[] =>
      nodes.map((node) => ({
        key: node.key,
        title: node.title,
        children: node.children ? decorate(node.children) : undefined,
      }));
    return decorate(board.zone_tree);
  }, [board.zone_tree]);

  const phaseColumns = useMemo((): ColumnsType<PhaseTableRow> => {
    return [
      {
        title: "Done",
        key: "done",
        width: 64,
        align: "center",
        render: (_, row) => (
          <Checkbox
            checked={row.state === true}
            indeterminate={row.state === "indeterminate"}
            disabled={readOnly}
            onChange={(e) =>
              setPhaseChecked(selectedZoneId, row.key, e.target.checked)
            }
            aria-label={`${row.label} for ${zoneTitleById(board.zone_tree, selectedZoneId)}`}
          />
        ),
      },
      {
        title: "Labor phase",
        dataIndex: "label",
        key: "label",
      },
      {
        title: "Places",
        key: "places",
        width: 100,
        render: (_, row) => (
          <Typography.Text type="secondary">
            {row.checkedCount}/{row.leafCount}
          </Typography.Text>
        ),
      },
    ];
  }, [board.zone_tree, readOnly, selectedZoneId, setPhaseChecked]);

  const workColumns = useMemo((): ColumnsType<WorkTableRow> => {
    return [
      {
        title: "Qty",
        dataIndex: "qty",
        key: "qty",
        width: 56,
        align: "right",
      },
      {
        title: "Item",
        dataIndex: "item",
        key: "item",
        ellipsis: true,
      },
      {
        title: "Part",
        key: "part",
        width: 140,
        render: (_, row) =>
          row.display_part_mpn ? (
            row.display_part_mpn
          ) : (
            <Tag color="warning">TBD</Tag>
          ),
      },
      {
        title: "PO",
        key: "po",
        width: 120,
        render: (_, row) => {
          if (!row.purchase_order_number && !row.purchase_order_status) {
            return (
              <Typography.Text type="secondary">—</Typography.Text>
            );
          }
          return (
            <Typography.Text>
              {row.purchase_order_number ?? "PO"}
              {row.purchase_order_status
                ? ` · ${row.purchase_order_status}`
                : ""}
            </Typography.Text>
          );
        },
      },
    ];
  }, []);

  const selectedLabel = zoneTitleById(board.zone_tree, selectedZoneId);

  if (board.zone_tree.length === 0) {
    return (
      <Typography.Paragraph type="secondary">
        No field progress yet — add active line items with labor phases (and
        optional zone places) on the Scope tab, then return here.
      </Typography.Paragraph>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {readOnly ? (
        <Alert
          type="warning"
          showIcon
          message="Field progress is locked on cancelled jobs"
        />
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "stretch",
          minHeight: 420,
        }}
      >
        <div
          style={{
            width: 240,
            flexShrink: 0,
            overflow: "auto",
            borderRight: "1px solid var(--ant-color-border-secondary, #f0f0f0)",
            paddingRight: 12,
          }}
        >
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Zones
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
            Allocated places plus General for unplaced qty. Check Done or Order
            on a parent to cascade to matching descendant leaves.
          </Typography.Paragraph>
          <Tree
            treeData={treeData}
            selectedKeys={[selectedZoneId]}
            defaultExpandAll
            onSelect={(keys) => {
              if (keys.length > 0) {
                setSelectedZoneId(String(keys[0]));
              }
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
              Phases — {selectedLabel}
            </Typography.Title>
            <Table<PhaseTableRow>
              size="small"
              rowKey="key"
              columns={phaseColumns}
              dataSource={phaseRows}
              pagination={false}
              locale={{
                emptyText: "No labor phases under this zone.",
              }}
            />
            <div style={{ marginTop: 12 }}>
              <Checkbox
                checked={orderState.state === true}
                indeterminate={orderState.state === "indeterminate"}
                disabled={
                  readOnly || (orderState.locked && orderState.state === true)
                }
                onChange={(e) => setOrderChecked(selectedZoneId, e.target.checked)}
                aria-label={`Order materials for ${selectedLabel}`}
              >
                Order
                {orderState.leafCount > 0 ? (
                  <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                    {orderState.checkedCount}/{orderState.leafCount}
                  </Typography.Text>
                ) : null}
              </Checkbox>
              {orderState.locked ? (
                <Typography.Text
                  type="secondary"
                  style={{ display: "block", marginTop: 4, fontSize: 12 }}
                >
                  Locked — lines on a purchase order or fulfilled
                </Typography.Text>
              ) : null}
            </div>
          </div>

          <div>
            <Table<WorkTableRow>
              size="small"
              rowKey="id"
              columns={workColumns}
              dataSource={filteredWorkRows}
              pagination={false}
              locale={{
                emptyText: "No work under this zone.",
              }}
            />
          </div>
        </div>
      </div>
    </Space>
  );
};

/** @deprecated Prefer JobFieldProgressPanels */
export const JobFieldExplorePanels = JobFieldProgressPanels;
