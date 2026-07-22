"use client";

import { CheckOutlined, CloseOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DataNode } from "antd/es/tree";
import { useCallback, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import {
  countUnlockedExcludedForPhase,
  type JobFieldOrderCell,
  type JobFieldOrderCellPatch,
  type JobFieldOrderRow,
} from "@/lib/jobs/repository/job-field-order";
import {
  GENERAL_ZONE_KEY,
  siteZoneIdFromKey,
  type JobFieldProgressCell,
  type JobFieldProgressDto,
  type JobFieldProgressPhaseColumn,
  type JobFieldProgressWorkRow,
  type JobFieldProgressZoneNode,
} from "@/lib/jobs/repository/job-field-progress";
import {
  collectLeafKeys,
  derivePhaseCheckState,
  findZoneNode,
  leavesWithPhase,
  leafPhaseValue,
  setPhaseCheckedAcrossLeaves,
  type CascadeCell,
  type CascadeWorkRow,
  type CheckState,
} from "@/lib/jobs/repository/job-field-zone-cascade";
import type {
  JobFieldIssuePatch,
  JobIssueRow,
} from "@/lib/jobs/repository/job-issue";

type PhaseTableRow = {
  checkedCount: number;
  key: string;
  label: string;
  leafCount: number;
  orderCheckedCount: number;
  orderLeafCount: number;
  orderState: CheckState;
  orderUnlockedExcluded: number;
  state: CheckState;
};

type FieldProgressFormSlice = {
  field_issues?: JobFieldIssuePatch[];
  field_progress?: JobFieldProgressCell[];
  field_zone_orders?: JobFieldOrderCellPatch[];
};

const newTempId = (): string =>
  `tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const isPendingIssueId = (id: string): boolean => id.startsWith("tmp_");

const mergeDisplayIssues = (
  persisted: JobIssueRow[],
  patches: JobFieldIssuePatch[] | undefined,
): JobIssueRow[] => {
  const byId = new Map(persisted.map((row) => [row.id, { ...row }] as const));
  const pendingCreates: JobIssueRow[] = [];

  for (const patch of patches ?? []) {
    if (patch.op === "create") {
      pendingCreates.push({
        id: patch.temp_id,
        site_zone_id: patch.site_zone_id,
        description: patch.description,
        status: "open",
        reported_by: null,
        reported_at: new Date().toISOString(),
        resolved_by: null,
        resolved_at: null,
        resolution_note: "",
      });
      continue;
    }
    if (patch.op === "delete") {
      continue;
    }
    const row = byId.get(patch.id);
    if (!row) {
      continue;
    }
    if (patch.op === "update") {
      byId.set(patch.id, {
        ...row,
        description: patch.description,
      });
    } else if (patch.op === "resolve") {
      byId.set(patch.id, {
        ...row,
        status: "resolved",
        resolution_note: patch.resolution_note,
        resolved_at: new Date().toISOString(),
      });
    } else if (patch.op === "cancel") {
      byId.set(patch.id, {
        ...row,
        status: "cancelled",
        resolution_note: patch.resolution_note ?? "",
        resolved_at: new Date().toISOString(),
      });
    }
  }

  return [...pendingCreates, ...byId.values()];
};

const zoneTitleById = (
  nodes: JobFieldProgressZoneNode[],
  key: string,
): string => findZoneNode(nodes, key)?.title ?? key;

const phasesForZone = (
  zoneKey: string,
  zoneTree: JobFieldProgressZoneNode[],
  workRows: JobFieldProgressWorkRow[],
  phases: JobFieldProgressPhaseColumn[],
): JobFieldProgressPhaseColumn[] => {
  const set = new Set<string>();
  for (const leaf of collectLeafKeys(zoneTree, zoneKey)) {
    for (const row of workRows) {
      if (row.zone_key === leaf) {
        for (const id of row.labor_phase_ids) {
          set.add(id);
        }
      }
    }
  }
  return phases.filter((p) => set.has(p.labor_phase_id));
};

const toCascadeWorkRows = (
  rows: JobFieldProgressWorkRow[],
): CascadeWorkRow[] =>
  rows.map((row) => ({
    job_line_id: row.job_line_id,
    zone_key: row.zone_key,
    labor_phase_ids: row.labor_phase_ids,
  }));

const orderRowsAsCascade = (rows: JobFieldOrderRow[]): CascadeWorkRow[] =>
  rows.map((row) => ({
    job_line_id: row.job_line_id,
    zone_key: row.zone_key,
    labor_phase_ids: [row.labor_phase_id],
  }));

const progressCellsToCascade = (
  cells: JobFieldProgressCell[],
): CascadeCell[] =>
  cells.map((c) => ({
    scope_phase_id: c.scope_phase_id,
    site_zone_id: c.site_zone_id,
    value: c.complete,
  }));

const orderCellsToCascade = (cells: JobFieldOrderCell[]): CascadeCell[] =>
  cells.map((c) => ({
    scope_phase_id: c.scope_phase_id,
    site_zone_id: c.site_zone_id,
    value: c.requested,
  }));

const cascadeToProgressCells = (cells: CascadeCell[]): JobFieldProgressCell[] =>
  cells.map((c) => ({
    scope_phase_id: c.scope_phase_id,
    site_zone_id: c.site_zone_id,
    complete: c.value,
  }));

const cascadeToOrderPatches = (
  cells: CascadeCell[],
): JobFieldOrderCellPatch[] =>
  cells.map((c) => ({
    scope_phase_id: c.scope_phase_id,
    site_zone_id: c.site_zone_id,
    requested: c.value,
  }));

const buildOrderScopeIndex = (
  orderRows: JobFieldOrderRow[],
): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  for (const row of orderRows) {
    const key = `${row.job_line_id}:${row.labor_phase_id}`;
    const list = map.get(key) ?? [];
    if (!list.includes(row.scope_phase_id)) {
      list.push(row.scope_phase_id);
    }
    map.set(key, list);
  }
  return map;
};

type JobFieldProgressPanelsProps = {
  board: JobFieldProgressDto;
  readOnly?: boolean;
};

export const JobFieldProgressPanels = ({
  board,
  readOnly = false,
}: JobFieldProgressPanelsProps) => {
  const { modal } = App.useApp();
  const { setValue, control } = useFormContext<FieldProgressFormSlice>();
  const formCells = useWatch({ control, name: "field_progress" });
  const formOrderCells = useWatch({ control, name: "field_zone_orders" });
  const formIssues = useWatch({ control, name: "field_issues" });
  const cells = formCells ?? board.cells;
  const [showClosedIssues, setShowClosedIssues] = useState(false);

  const orderCells: JobFieldOrderCell[] = useMemo(() => {
    if (!formOrderCells) {
      return board.order_cells;
    }
    const byKey = new Map<string, JobFieldOrderCell>(
      board.order_cells.map((c) => [
        `${c.scope_phase_id}:${c.site_zone_id ?? GENERAL_ZONE_KEY}`,
        { ...c },
      ]),
    );
    for (const patch of formOrderCells) {
      const key = `${patch.scope_phase_id}:${patch.site_zone_id ?? GENERAL_ZONE_KEY}`;
      const prior = byKey.get(key);
      byKey.set(key, {
        scope_phase_id: patch.scope_phase_id,
        site_zone_id: patch.site_zone_id,
        requested: patch.requested,
        unlocked_excluded_count: prior?.unlocked_excluded_count ?? 0,
      });
    }
    return [...byKey.values()];
  }, [board.order_cells, formOrderCells]);

  const displayIssues = useMemo(
    () => mergeDisplayIssues(board.issues ?? [], formIssues),
    [board.issues, formIssues],
  );

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

  const orderScopeIndex = useMemo(
    () => buildOrderScopeIndex(board.order_rows),
    [board.order_rows],
  );

  const cascadeWorkRows = useMemo(
    () => toCascadeWorkRows(board.work_rows),
    [board.work_rows],
  );
  const cascadeOrderRows = useMemo(
    () => orderRowsAsCascade(board.order_rows),
    [board.order_rows],
  );

  const setPhaseChecked = useCallback(
    (zoneId: string, laborPhaseId: string, checked: boolean) => {
      if (readOnly) {
        return;
      }
      const next = setPhaseCheckedAcrossLeaves(
        zoneId,
        laborPhaseId,
        checked,
        board.zone_tree,
        cascadeWorkRows,
        progressCellsToCascade(cells),
        scopePhasesByLineLabor,
      );
      setValue("field_progress", cascadeToProgressCells(next), {
        shouldDirty: true,
      });
    },
    [
      board.zone_tree,
      cascadeWorkRows,
      cells,
      readOnly,
      scopePhasesByLineLabor,
      setValue,
    ],
  );

  const setOrderChecked = useCallback(
    (zoneId: string, laborPhaseId: string, checked: boolean) => {
      if (readOnly) {
        return;
      }
      const next = setPhaseCheckedAcrossLeaves(
        zoneId,
        laborPhaseId,
        checked,
        board.zone_tree,
        cascadeOrderRows,
        orderCellsToCascade(orderCells),
        orderScopeIndex,
      );
      setValue("field_zone_orders", cascadeToOrderPatches(next), {
        shouldDirty: true,
      });
    },
    [
      board.zone_tree,
      cascadeOrderRows,
      orderCells,
      orderScopeIndex,
      readOnly,
      setValue,
    ],
  );

  const appendIssuePatch = useCallback(
    (patch: JobFieldIssuePatch) => {
      const next = [...(formIssues ?? []), patch];
      setValue("field_issues", next, { shouldDirty: true });
    },
    [formIssues, setValue],
  );

  const replaceIssuePatches = useCallback(
    (next: JobFieldIssuePatch[]) => {
      setValue("field_issues", next, { shouldDirty: true });
    },
    [setValue],
  );

  const reportIssue = useCallback(() => {
    if (readOnly) {
      return;
    }
    appendIssuePatch({
      op: "create",
      temp_id: newTempId(),
      site_zone_id: siteZoneIdFromKey(selectedZoneId),
      description: "",
    });
  }, [appendIssuePatch, readOnly, selectedZoneId]);

  const deletePendingIssue = useCallback(
    (issueId: string) => {
      if (readOnly || !isPendingIssueId(issueId)) {
        return;
      }
      replaceIssuePatches(
        (formIssues ?? []).filter(
          (p) => !(p.op === "create" && p.temp_id === issueId),
        ),
      );
    },
    [formIssues, readOnly, replaceIssuePatches],
  );

  const setIssueDescription = useCallback(
    (issueId: string, description: string) => {
      if (readOnly) {
        return;
      }
      if (isPendingIssueId(issueId)) {
        replaceIssuePatches(
          (formIssues ?? []).map((patch) =>
            patch.op === "create" && patch.temp_id === issueId
              ? { ...patch, description }
              : patch,
          ),
        );
        return;
      }

      const withoutPriorUpdate = (formIssues ?? []).filter(
        (patch) => !(patch.op === "update" && patch.id === issueId),
      );
      replaceIssuePatches([
        ...withoutPriorUpdate,
        { op: "update", id: issueId, description },
      ]);
    },
    [formIssues, readOnly, replaceIssuePatches],
  );

  const queueCancelIssue = useCallback(
    (issueId: string) => {
      if (readOnly || isPendingIssueId(issueId)) {
        return;
      }
      let note = "";
      modal.confirm({
        title: "Cancel issue",
        content: (
          <Input.TextArea
            rows={3}
            placeholder="Cancel note (optional)"
            onChange={(e) => {
              note = e.target.value;
            }}
          />
        ),
        okText: "Cancel issue",
        okButtonProps: { danger: true },
        onOk: () => {
          const trimmed = note.trim();
          appendIssuePatch({
            op: "cancel",
            id: issueId,
            ...(trimmed ? { resolution_note: trimmed } : {}),
          });
        },
      });
    },
    [appendIssuePatch, modal, readOnly],
  );

  const queueResolveIssue = useCallback(
    (issueId: string) => {
      if (readOnly) {
        return;
      }
      if (isPendingIssueId(issueId)) {
        return;
      }
      let note = "";
      modal.confirm({
        title: "Resolve issue",
        content: (
          <Input.TextArea
            rows={3}
            placeholder="Resolution note (required)"
            onChange={(e) => {
              note = e.target.value;
            }}
          />
        ),
        okText: "Resolve",
        onOk: () => {
          const trimmed = note.trim();
          if (!trimmed) {
            return Promise.reject(new Error("Resolution note is required"));
          }
          appendIssuePatch({
            op: "resolve",
            id: issueId,
            resolution_note: trimmed,
          });
        },
      });
    },
    [appendIssuePatch, modal, readOnly],
  );

  const phaseRows = useMemo((): PhaseTableRow[] => {
    const cascadeCells = progressCellsToCascade(cells);
    const cascadeOrders = orderCellsToCascade(orderCells);
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
        cascadeWorkRows,
      );
      const state = derivePhaseCheckState(
        selectedZoneId,
        phase.labor_phase_id,
        board.zone_tree,
        cascadeWorkRows,
        cascadeCells,
        scopePhasesByLineLabor,
      );
      const checkedCount = leaves.filter((leaf) =>
        leafPhaseValue(
          leaf,
          phase.labor_phase_id,
          cascadeWorkRows,
          cascadeCells,
          scopePhasesByLineLabor,
        ),
      ).length;

      const orderLeaves = leavesWithPhase(
        selectedZoneId,
        phase.labor_phase_id,
        board.zone_tree,
        cascadeOrderRows,
      );
      const orderState = derivePhaseCheckState(
        selectedZoneId,
        phase.labor_phase_id,
        board.zone_tree,
        cascadeOrderRows,
        cascadeOrders,
        orderScopeIndex,
      );
      const orderCheckedCount = orderLeaves.filter((leaf) =>
        leafPhaseValue(
          leaf,
          phase.labor_phase_id,
          cascadeOrderRows,
          cascadeOrders,
          orderScopeIndex,
        ),
      ).length;
      const orderUnlockedExcluded = countUnlockedExcludedForPhase(
        board.order_rows,
        collectLeafKeys(board.zone_tree, selectedZoneId),
        phase.labor_phase_id,
      );

      return {
        key: phase.labor_phase_id,
        label: phase.name,
        state,
        leafCount: leaves.length,
        checkedCount,
        orderState,
        orderLeafCount: orderLeaves.length,
        orderCheckedCount,
        orderUnlockedExcluded,
      };
    });
  }, [
    board.order_rows,
    board.phases,
    board.work_rows,
    board.zone_tree,
    cascadeOrderRows,
    cascadeWorkRows,
    cells,
    orderCells,
    orderScopeIndex,
    scopePhasesByLineLabor,
    selectedZoneId,
  ]);

  const selectedZoneSiteId = siteZoneIdFromKey(selectedZoneId);

  const zoneOpenIssues = useMemo(
    () =>
      displayIssues.filter(
        (row) =>
          row.status === "open" &&
          (row.site_zone_id ?? null) === selectedZoneSiteId,
      ),
    [displayIssues, selectedZoneSiteId],
  );

  const zoneClosedIssues = useMemo(
    () =>
      displayIssues.filter(
        (row) =>
          row.status !== "open" &&
          (row.site_zone_id ?? null) === selectedZoneSiteId,
      ),
    [displayIssues, selectedZoneSiteId],
  );

  const zoneIssueRows = useMemo(
    () =>
      showClosedIssues
        ? [...zoneOpenIssues, ...zoneClosedIssues]
        : zoneOpenIssues,
    [showClosedIssues, zoneClosedIssues, zoneOpenIssues],
  );

  const issueColumns = useMemo((): ColumnsType<JobIssueRow> => {
    return [
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (_value, row) => {
          const editable = !readOnly && row.status === "open";
          if (!editable) {
            return (
              <Typography.Text
                type={row.status === "open" ? undefined : "secondary"}
                style={{
                  textDecoration:
                    row.status === "cancelled" ? "line-through" : undefined,
                }}
              >
                {row.description}
                {row.resolution_note ? ` — ${row.resolution_note}` : ""}
              </Typography.Text>
            );
          }
          return (
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 4 }}
              value={row.description}
              placeholder="Describe the issue…"
              style={{ width: "100%" }}
              onChange={(e) => setIssueDescription(row.id, e.target.value)}
            />
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 88,
        render: (status: JobIssueRow["status"], row) => {
          if (isPendingIssueId(row.id) && status === "open") {
            return <Tag>unsaved</Tag>;
          }
          return (
            <Tag
              color={
                status === "open"
                  ? "processing"
                  : status === "resolved"
                    ? "success"
                    : undefined
              }
            >
              {status}
            </Tag>
          );
        },
      },
      {
        title: "",
        key: "actions",
        width: 72,
        align: "center" as const,
        render: (_value, row) => {
          if (readOnly || row.status !== "open") {
            return null;
          }
          if (isPendingIssueId(row.id)) {
            return (
              <Tooltip title="Delete">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="Delete issue"
                  onClick={() => deletePendingIssue(row.id)}
                />
              </Tooltip>
            );
          }
          return (
            <Space size={0}>
              <Tooltip title="Resolve">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  aria-label="Resolve issue"
                  onClick={() => queueResolveIssue(row.id)}
                />
              </Tooltip>
              <Tooltip title="Cancel">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  aria-label="Cancel issue"
                  onClick={() => queueCancelIssue(row.id)}
                />
              </Tooltip>
            </Space>
          );
        },
      },
    ];
  }, [
    deletePendingIssue,
    queueCancelIssue,
    queueResolveIssue,
    readOnly,
    setIssueDescription,
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
        title: "Order",
        key: "order",
        width: 72,
        align: "center",
        render: (_, row) => {
          const checkbox = (
            <Checkbox
              checked={row.orderState === true}
              indeterminate={row.orderState === "indeterminate"}
              disabled={readOnly || row.orderLeafCount === 0}
              onChange={(e) =>
                setOrderChecked(selectedZoneId, row.key, e.target.checked)
              }
              aria-label={`Order ${row.label} for ${zoneTitleById(board.zone_tree, selectedZoneId)}`}
            />
          );
          if (row.orderUnlockedExcluded <= 0) {
            return checkbox;
          }
          return (
            <Tooltip
              title={`${row.orderUnlockedExcluded} unlocked line${row.orderUnlockedExcluded === 1 ? "" : "s"} excluded`}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {checkbox}
                <Tag style={{ marginInlineEnd: 0, lineHeight: "18px", paddingInline: 4 }}>
                  {row.orderUnlockedExcluded}
                </Tag>
              </span>
            </Tooltip>
          );
        },
      },
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
  }, [
    board.zone_tree,
    readOnly,
    selectedZoneId,
    setOrderChecked,
    setPhaseChecked,
  ]);

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
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
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
            Allocated places plus General for unplaced qty. Check Order or Done
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
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Typography.Title level={5} style={{ margin: 0 }}>
                Issues — {selectedLabel}
              </Typography.Title>
              {zoneClosedIssues.length > 0 ? (
                <Button
                  type="link"
                  size="small"
                  style={{ paddingInline: 0 }}
                  onClick={() => setShowClosedIssues((v) => !v)}
                >
                  {showClosedIssues ? "Hide closed" : "Show closed"} (
                  {zoneClosedIssues.length})
                </Button>
              ) : null}
            </div>
            <Table<JobIssueRow>
              size="small"
              rowKey="id"
              columns={issueColumns}
              dataSource={zoneIssueRows}
              pagination={false}
              locale={{ emptyText: " " }}
            />
            {!readOnly ? (
              <Button
                style={{ marginTop: 8 }}
                size="small"
                type="dashed"
                block
                onClick={reportIssue}
              >
                Add issue
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Space>
  );
};

/** @deprecated Prefer JobFieldProgressPanels */
export const JobFieldExplorePanels = JobFieldProgressPanels;
