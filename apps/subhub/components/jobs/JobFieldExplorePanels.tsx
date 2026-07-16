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
import { useFormContext } from "react-hook-form";

import {
  GENERAL_ZONE_KEY,
  type JobFieldProgressCell,
  type JobFieldProgressDto,
  type JobFieldProgressPhaseColumn,
  type JobFieldProgressWorkRow,
  type JobFieldProgressZoneNode,
} from "@/lib/jobs/repository/job-field-progress";

type CheckState = boolean | "indeterminate";

type PhaseTableRow = {
  checkedCount: number;
  key: string;
  label: string;
  leafCount: number;
  state: CheckState;
};

type WorkTableRow = JobFieldProgressWorkRow;

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

type JobFieldProgressPanelsProps = {
  board: JobFieldProgressDto;
  readOnly?: boolean;
};

type FieldProgressFormSlice = {
  field_progress?: JobFieldProgressCell[];
};

export const JobFieldProgressPanels = ({
  board,
  readOnly = false,
}: JobFieldProgressPanelsProps) => {
  const { setValue, watch } = useFormContext<FieldProgressFormSlice>();
  const formCells = watch("field_progress");
  const cells = formCells ?? board.cells;

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

  const zoneScopeKeys = useMemo(
    () => collectSubtreeKeys(board.zone_tree, selectedZoneId),
    [board.zone_tree, selectedZoneId],
  );

  const filteredWorkRows = useMemo(() => {
    return board.work_rows.filter((row) => {
      if (zoneScopeKeys && !zoneScopeKeys.has(row.zone_key)) {
        return false;
      }
      return true;
    });
  }, [board.work_rows, zoneScopeKeys]);

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
          row.part_mpn ? row.part_mpn : <Tag color="warning">TBD</Tag>,
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
            Allocated places plus General for unplaced qty. Check a phase on a
            parent to cascade to matching descendant leaves.
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
