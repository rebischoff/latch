"use client";

import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

export const RoleListPane = () => {
  const pathname = usePathname();
  const { data, isLoading, error } = useSurfaceList("role_list");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load roles.</Typography.Text>
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
        pathname === routes.roles.detail(record.id) ? "ant-table-row-selected" : ""
      }
      onRow={() => ({
        style: { cursor: "pointer" },
      })}
      columns={[
        {
          title: "Role",
          render: (_, row) => (
            <Link href={routes.roles.detail(row.id)}>
              {row.summary?.display_name ?? row.id}
            </Link>
          ),
        },
        {
          title: "Class",
          render: (_, row) => row.summary?.role_class ?? "—",
        },
      ]}
    />
  );
};
