"use client";

import { Alert, Button, Checkbox, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useMemo, useState } from "react";

type PhaseKey = "install" | "program" | "test";

type OrderStatus = "not_ordered" | "requested" | "on_po";

type FieldExploreRow = {
  id: string;
  location: string;
  item: string;
  partMpn: string | null;
  qty: number;
  phaseHours: Record<PhaseKey, number>;
};

type RowState = {
  phases: Record<PhaseKey, boolean>;
  orderStatus: OrderStatus;
};

const FIXTURE_ROWS: FieldExploreRow[] = [
  {
    id: "row-1",
    location: "Fire alarm / Floor 3 / Door 12",
    item: "Strobe / Horn",
    partMpn: "WL-STRB-24-R",
    qty: 1,
    phaseHours: { install: 0.5, program: 0.25, test: 0.15 },
  },
  {
    id: "row-2",
    location: "Fire alarm / Floor 3 / Door 14",
    item: "Strobe / Horn",
    partMpn: null,
    qty: 1,
    phaseHours: { install: 0.5, program: 0.25, test: 0.15 },
  },
  {
    id: "row-3",
    location: "Fire alarm / Floor 3 / Corridor B",
    item: "Smoke detector",
    partMpn: "SD-2W-PHOTO",
    qty: 2,
    phaseHours: { install: 0.35, program: 0.2, test: 0.1 },
  },
  {
    id: "row-4",
    location: "Access / Lobby / Main entry",
    item: "Card reader",
    partMpn: "CR-PROX-1",
    qty: 1,
    phaseHours: { install: 0.75, program: 0.5, test: 0.25 },
  },
  {
    id: "row-5",
    location: "Unplaced",
    item: "Strobe / Horn",
    partMpn: null,
    qty: 3,
    phaseHours: { install: 0.5, program: 0.25, test: 0.15 },
  },
];

const INITIAL_ROW_STATE = (): RowState => ({
  phases: { install: false, program: false, test: false },
  orderStatus: "not_ordered",
});

type FieldFilter = "all" | "tbd_part" | "not_ordered" | "install_incomplete";

const FILTER_OPTIONS: { value: FieldFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tbd_part", label: "TBD part" },
  { value: "not_ordered", label: "Not ordered" },
  { value: "install_incomplete", label: "Install incomplete" },
];

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  not_ordered: "Not ordered",
  requested: "Requested",
  on_po: "On PO",
};

const formatPhaseHours = (hours: number): string =>
  hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(2).replace(/\.?0+$/, "")}h`;

type TableRow = FieldExploreRow & { state: RowState };

export const JobFieldExploreTable = () => {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(FIXTURE_ROWS.map((row) => [row.id, INITIAL_ROW_STATE()])),
  );
  const [filter, setFilter] = useState<FieldFilter>("all");

  const togglePhase = useCallback((rowId: string, phase: PhaseKey) => {
    setRowStates((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        phases: {
          ...prev[rowId].phases,
          [phase]: !prev[rowId].phases[phase],
        },
      },
    }));
  }, []);

  const requestOrder = useCallback((rowId: string) => {
    setRowStates((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        orderStatus: "requested",
      },
    }));
  }, []);

  const tableRows = useMemo((): TableRow[] => {
    const sorted = [...FIXTURE_ROWS].sort((a, b) => {
      const loc = a.location.localeCompare(b.location);
      if (loc !== 0) {
        return loc;
      }
      return a.item.localeCompare(b.item);
    });

    return sorted.map((row) => ({
      ...row,
      state: rowStates[row.id] ?? INITIAL_ROW_STATE(),
    }));
  }, [rowStates]);

  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      switch (filter) {
        case "tbd_part":
          return row.partMpn === null;
        case "not_ordered":
          return row.state.orderStatus === "not_ordered";
        case "install_incomplete":
          return !row.state.phases.install;
        default:
          return true;
      }
    });
  }, [filter, tableRows]);

  const renderPhaseCell = useCallback(
    (row: TableRow, phase: PhaseKey) => {
      const hours = row.phaseHours[phase];
      const checked = row.state.phases[phase];

      return (
        <Space size={4} align="center">
          <Checkbox checked={checked} onChange={() => togglePhase(row.id, phase)} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatPhaseHours(hours)}
          </Typography.Text>
        </Space>
      );
    },
    [togglePhase],
  );

  const columns = useMemo((): ColumnsType<TableRow> => {
    return [
      {
        title: "Location",
        dataIndex: "location",
        key: "location",
        width: 220,
        ellipsis: true,
        render: (location: string) =>
          location === "Unplaced" ? (
            <Typography.Text type="secondary" italic>
              Unplaced
            </Typography.Text>
          ) : (
            location
          ),
      },
      {
        title: "Item",
        dataIndex: "item",
        key: "item",
        width: 160,
        ellipsis: true,
      },
      {
        title: "Part",
        key: "part",
        width: 140,
        render: (_, row) =>
          row.partMpn ? (
            row.partMpn
          ) : (
            <Tag color="warning">TBD</Tag>
          ),
      },
      {
        title: "Qty",
        dataIndex: "qty",
        key: "qty",
        width: 56,
        align: "right",
      },
      {
        title: "Install",
        key: "install",
        width: 100,
        render: (_, row) => renderPhaseCell(row, "install"),
      },
      {
        title: "Program",
        key: "program",
        width: 100,
        render: (_, row) => renderPhaseCell(row, "program"),
      },
      {
        title: "Test",
        key: "test",
        width: 90,
        render: (_, row) => renderPhaseCell(row, "test"),
      },
      {
        title: "Order",
        key: "order",
        width: 180,
        render: (_, row) => {
          const status = row.state.orderStatus;
          const partTbd = row.partMpn === null;

          return (
            <Space size={8} wrap>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {ORDER_STATUS_LABEL[status]}
              </Typography.Text>
              <Button
                type="link"
                size="small"
                disabled={partTbd || status !== "not_ordered"}
                onClick={() => requestOrder(row.id)}
                style={{ padding: 0, height: "auto" }}
              >
                Request order
              </Button>
            </Space>
          );
        },
      },
    ];
  }, [renderPhaseCell, requestOrder]);

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Explore UI — not saved"
        description="Temporary Field prototype: parts exploded by location. Interactions are local only."
      />

      <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
        <Select<FieldFilter>
          value={filter}
          onChange={setFilter}
          options={FILTER_OPTIONS}
          style={{ width: 200 }}
          aria-label="Filter field rows"
        />
        <Typography.Text type="secondary">
          {filteredRows.length} of {tableRows.length} rows
        </Typography.Text>
      </Space>

      <Table<TableRow>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={filteredRows}
        pagination={false}
        scroll={{ x: 1046 }}
      />
    </Space>
  );
};
