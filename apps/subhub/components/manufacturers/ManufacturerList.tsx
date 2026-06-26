"use client";

import { PlusOutlined } from "@ant-design/icons";
import { fieldAllows, type Manifest } from "@latch/contracts";
import { Input, Table, Typography } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

type ManufacturerListSummary = {
  display_name?: string | null;
  kind?: string | null;
};

type ManufacturerListProps = {
  createManifest: Manifest;
};

const manufacturerLabel = (row: {
  summary?: ManufacturerListSummary;
  id: string;
}): string => row.summary?.display_name ?? row.id;

const kindLabel = (kind: string | null | undefined): string => {
  if (kind === "person") {
    return "Person";
  }
  if (kind === "organization") {
    return "Organization";
  }
  return kind ?? "—";
};

export const ManufacturerList = ({ createManifest }: ManufacturerListProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const listQuery = debouncedSearch ? { q: debouncedSearch } : undefined;
  const { data, isLoading, isFetching, error } = useSurfaceList(
    "manufacturer_list",
    listQuery,
  );

  const onCreate = useCallback(() => {
    router.push(routes.manufacturers.new);
  }, [router]);

  const onListRoute = pathname === routes.manufacturers.list;
  const listManifest = data?.manifest;

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

  const showKind =
    listManifest !== undefined && fieldAllows(listManifest, "summary", "read");
  const showSearch =
    listManifest !== undefined && fieldAllows(listManifest, "summary", "read");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load manufacturers.</Typography.Text>
      </div>
    );
  }

  return (
    <div>
      {showSearch ? (
        <div style={{ padding: "8px 8px 0" }}>
          <Input.Search
            allowClear
            placeholder="Search name or legal name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      ) : null}
      <Table
      size="small"
      loading={isLoading || isFetching}
      rowKey="id"
      pagination={false}
      dataSource={data?.data.rows ?? []}
      rowClassName={(record) =>
        pathname === routes.manufacturers.detail(record.id) ? "ant-table-row-selected" : ""
      }
      onRow={() => ({
        style: { cursor: "pointer" },
      })}
      columns={[
        {
          title: "Name",
          render: (_, row) => (
            <Link href={routes.manufacturers.detail(row.id)}>{manufacturerLabel(row)}</Link>
          ),
        },
        ...(showKind
          ? [
              {
                title: "Kind",
                render: (_: unknown, row: { summary?: ManufacturerListSummary }) =>
                  kindLabel(row.summary?.kind),
              },
            ]
          : []),
      ]}
    />
    </div>
  );
};
