"use client";

import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";
import { buildDetailHref } from "@/lib/surface-navigation";

type JobListSummary = {
  title?: string | null;
  site_display_name?: string | null;
  name?: string | null;
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
      ]}
    />
  );
};
