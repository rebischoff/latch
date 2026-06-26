"use client";

import { PlusOutlined } from "@ant-design/icons";
import type { Manifest } from "@latch/contracts";
import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

type RoleListPaneProps = {
  createManifest: Manifest;
};

export const RoleListPane = ({ createManifest }: RoleListPaneProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading, error } = useSurfaceList("role_list");

  const onCreate = useCallback(() => {
    router.push(routes.roles.new);
  }, [router]);

  const onListRoute = pathname === routes.roles.list;

  const toolbarActions = useMemo(
    () =>
      onListRoute
        ? [
            {
              key: "new",
              label: "New role",
              icon: <PlusOutlined />,
              priority: "secondary" as const,
              surfaceAction: "create" as const,
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
