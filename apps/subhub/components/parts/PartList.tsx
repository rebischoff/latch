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

type PartListSummary = {
  mpn?: string | null;
  description?: string | null;
  display_name?: string | null;
};

type PartListProps = {
  createManifest: Manifest;
};

export const PartList = ({ createManifest }: PartListProps) => {
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
  const { data, isLoading, isFetching, error } = useSurfaceList("part_list", listQuery);

  const onCreate = useCallback(() => {
    const id = crypto.randomUUID();
    router.push(`${routes.parts.detail(id)}?create=1`);
  }, [router]);

  const onListRoute = pathname === routes.parts.list;
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

  const showSearch =
    listManifest !== undefined && fieldAllows(listManifest, "summary", "read");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load parts.</Typography.Text>
      </div>
    );
  }

  return (
    <div>
      {showSearch ? (
        <div style={{ padding: "8px 8px 0" }}>
          <Input.Search
            allowClear
            placeholder="Search MPN or description"
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
          pathname === routes.parts.detail(record.id) ? "ant-table-row-selected" : ""
        }
        onRow={() => ({
          style: { cursor: "pointer" },
        })}
        columns={[
          {
            title: "MPN",
            render: (_, row) => {
              const summary = row.summary as PartListSummary | undefined;
              return (
                <Link href={routes.parts.detail(row.id)}>
                  {summary?.mpn ?? row.id}
                </Link>
              );
            },
          },
          {
            title: "Description",
            render: (_, row) => {
              const summary = row.summary as PartListSummary | undefined;
              return summary?.description ?? "—";
            },
          },
          {
            title: "Manufacturer",
            render: (_, row) => {
              const summary = row.summary as PartListSummary | undefined;
              return summary?.display_name ?? "—";
            },
          },
        ]}
      />
    </div>
  );
};
