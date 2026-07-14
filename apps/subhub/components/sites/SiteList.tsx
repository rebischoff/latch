"use client";

import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";
import { buildDetailHref } from "@/lib/surface-navigation";

const siteLabel = (row: {
  summary?: {
    name?: string | null;
  };
  id: string;
}): string => row.summary?.name ?? row.id;

export const SiteList = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, isLoading, error } = useSurfaceList("site_list");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load sites.</Typography.Text>
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
        pathname === routes.sites.detail(record.id) ? "ant-table-row-selected" : ""
      }
      onRow={() => ({
        style: { cursor: "pointer" },
      })}
      columns={[
        {
          title: "Name",
          render: (_, row) => (
            <Link
              href={buildDetailHref({
                detailPath: routes.sites.detail(row.id),
                currentSearch: searchParams,
              })}
            >
              {siteLabel(row)}
            </Link>
          ),
        },
      ]}
    />
  );
};
