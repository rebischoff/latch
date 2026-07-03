"use client";

import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

const siteLabel = (row: {
  summary?: {
    name?: string | null;
  };
  id: string;
}): string => row.summary?.name ?? row.id;

export const SiteList = () => {
  const pathname = usePathname();
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
            <Link href={routes.sites.detail(row.id)}>{siteLabel(row)}</Link>
          ),
        },
      ]}
    />
  );
};
