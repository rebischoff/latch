"use client";

import { Table, Tag, Typography } from "antd";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import type { JobFieldLifecycle } from "@/lib/jobs/repository/job-field-progress";
import { routes } from "@/lib/nav-routes";
import { buildDetailHref } from "@/lib/surface-navigation";

type JobListSummary = {
  title?: string | null;
  site_display_name?: string | null;
  name?: string | null;
  lifecycle?: JobFieldLifecycle | null;
  progress_pct?: number | null;
  stale?: boolean | null;
};

const LIFECYCLE_LABELS: Record<JobFieldLifecycle, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const LIFECYCLE_COLORS: Record<JobFieldLifecycle, string> = {
  not_started: "default",
  in_progress: "processing",
  completed: "success",
  cancelled: "error",
};

export const JobList = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, isLoading, error } = useSurfaceList("job_list");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load jobs.</Typography.Text>
      </div>
    );
  }

  return (
    <Table
      size="small"
      loading={isLoading}
      rowKey="id"
      pagination={false}
      dataSource={data?.data.rows ?? []}
      rowClassName={(record) =>
        pathname === routes.jobs.detail(record.id) ? "ant-table-row-selected" : ""
      }
      onRow={() => ({
        style: { cursor: "pointer" },
      })}
      columns={[
        {
          title: "Title",
          render: (_, row) => {
            const summary = row.summary as JobListSummary | undefined;
            return (
              <Link
                href={buildDetailHref({
                  detailPath: routes.jobs.detail(row.id),
                  currentSearch: searchParams,
                })}
              >
                {summary?.title ?? row.id}
              </Link>
            );
          },
        },
        {
          title: "Site",
          render: (_, row) => {
            const summary = row.summary as JobListSummary | undefined;
            return summary?.site_display_name ?? summary?.name ?? "—";
          },
        },
        {
          title: "Field",
          width: 160,
          render: (_, row) => {
            const summary = row.summary as JobListSummary | undefined;
            const lifecycle = summary?.lifecycle;
            if (!lifecycle) {
              return "—";
            }
            const pct = summary?.progress_pct ?? 0;
            return (
              <>
                <Tag color={LIFECYCLE_COLORS[lifecycle]}>
                  {LIFECYCLE_LABELS[lifecycle]}
                </Tag>
                {summary?.stale ? <Tag color="warning">Stale</Tag> : null}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {pct.toFixed(0)}%
                </Typography.Text>
              </>
            );
          },
        },
      ]}
    />
  );
};
