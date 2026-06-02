"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import type { ProjectedJobListRow } from "@latch/dal";
import { Empty, Table, type TableColumnsType } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

type ProjectedColumnField = Exclude<keyof ProjectedJobListRow, "id">;

type ColumnDef = {
  field: ProjectedColumnField;
  title: string;
  render: (row: ProjectedJobListRow) => React.ReactNode;
};

const dash = "—";

const COLUMN_DEFS: ColumnDef[] = [
  {
    field: "summary",
    title: "Title",
    render: (row) => row.summary?.title ?? dash,
  },
  {
    field: "summary",
    title: "Status",
    render: (row) => row.summary?.status ?? dash,
  },
  {
    field: "summary",
    title: "Scheduled",
    render: (row) =>
      row.summary?.scheduled_at
        ? new Date(row.summary.scheduled_at).toLocaleString()
        : dash,
  },
  {
    field: "customer_site",
    title: "Customer",
    render: (row) => row.customer_site?.name ?? dash,
  },
  {
    field: "customer_site",
    title: "Site",
    render: (row) => row.customer_site?.label ?? dash,
  },
  {
    field: "financial_terms",
    title: "Contract amount",
    render: (row) => row.financial_terms?.contract_amount ?? dash,
  },
  {
    field: "assignments",
    title: "Assignees",
    render: (row) => row.assignments?.length ?? 0,
  },
];

const buildColumns = (
  manifest: Manifest,
): TableColumnsType<ProjectedJobListRow> =>
  COLUMN_DEFS.filter((column) => fieldAllows(manifest, column.field, "read")).map(
    (column) => ({
      key: column.title,
      title: column.title,
      render: (_value, record) => column.render(record),
    }),
  );

type JobListPaneProps = {
  rows: ProjectedJobListRow[];
  total: number;
  manifest?: Manifest;
  selectedId?: string;
  loading?: boolean;
};

export const JobListPane = ({
  rows,
  total,
  manifest,
  selectedId,
  loading = false,
}: JobListPaneProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const columns = useMemo(
    () => (manifest ? buildColumns(manifest) : []),
    [manifest],
  );

  if (!loading && rows.length === 0 && manifest) {
    return <Empty description="No jobs" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <Table<ProjectedJobListRow>
      rowKey="id"
      size="small"
      loading={loading}
      pagination={false}
      columns={columns}
      dataSource={rows}
      footer={() =>
        `${total} ${total === 1 ? "job" : "jobs"}`
      }
      onRow={(record) => ({
        onClick: () => router.push(`${pathname}?id=${record.id}`),
        style: {
          cursor: "pointer",
          ...(record.id === selectedId
            ? { background: "rgba(22, 119, 255, 0.08)" }
            : {}),
        },
      })}
    />
  );
};
