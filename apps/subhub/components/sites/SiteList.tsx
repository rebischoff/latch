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

const siteLabel = (row: {
  summary?: {
    name?: string | null;
  };
  id: string;
}): string => row.summary?.name ?? row.id;

type SiteListProps = {
  createManifest: Manifest;
};

export const SiteList = ({ createManifest }: SiteListProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading, error } = useSurfaceList("site_list");

  const onCreate = useCallback(() => {
    const id = crypto.randomUUID();
    router.push(`${routes.sites.detail(id)}?create=1`);
  }, [router]);

  const onListRoute = pathname === routes.sites.list;

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
