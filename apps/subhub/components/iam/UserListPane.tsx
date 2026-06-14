"use client";

import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

const userLabel = (row: {
  summary?: {
    login_name?: string | null;
    login_email?: string | null;
  };
  id: string;
}): string =>
  row.summary?.login_name ?? row.summary?.login_email ?? row.id;

export const UserListPane = () => {
  const pathname = usePathname();
  const { data, isLoading, error } = useSurfaceList("user_list");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load users.</Typography.Text>
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
        pathname === routes.users.detail(record.id) ? "ant-table-row-selected" : ""
      }
      onRow={(record) => ({
        style: { cursor: "pointer" },
      })}
      columns={[
        {
          title: "Login",
          render: (_, row) => (
            <Link href={routes.users.detail(row.id)}>{userLabel(row)}</Link>
          ),
        },
        {
          title: "Login email",
          render: (_, row) => row.summary?.login_email ?? "—",
        },
      ]}
    />
  );
};
