"use client";

import { PlusOutlined } from "@ant-design/icons";
import { type Manifest } from "@latch/contracts";
import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

type JobListSummary = {
  title?: string | null;
  site_display_name?: string | null;
  name?: string | null;
};

type JobListProps = {
  createManifest: Manifest;
};

export const JobList = ({ createManifest }: JobListProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading, error } = useSurfaceList("job_list");

  const onCreate = useCallback(() => {
    const id = crypto.randomUUID();
    router.push(`${routes.jobs.detail(id)}?create=1`);
  }, [router]);

  const onListRoute = pathname === routes.jobs.list;

  const toolbarActions = useMemo(
    () =>
      onListRoute
        ? [
            {
              key: "new",
              label: "New",
              icon: <PlusOutlined />,
              priority: "secondary" as const,
              surfaceAction: "write" as const,
              onClick: onCreate,
            },
          ]
        : [],
    [onCreate, onListRoute],
  );

  useRegisterSurfaceActions(createManifest, toolbarActions);

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
              <Link href={routes.jobs.detail(row.id)}>
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
