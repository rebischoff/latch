"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SurfaceListError,
  SurfaceListTable,
} from "@/components/surface/SurfaceListTable";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { useSurfaceListSearch } from "@/lib/hooks/use-surface-list-search";
import { routes } from "@/lib/nav-routes";

type PartListSummary = {
  mpn?: string | null;
  display_name?: string | null;
};

export const PartList = () => {
  const pathname = usePathname();
  const baseList = useSurfaceList("part_list");
  const { search, setSearch, showSearch, listQuery } = useSurfaceListSearch(
    baseList.data?.manifest,
  );
  const searchList = useSurfaceList("part_list", listQuery);
  const active = listQuery ? searchList : baseList;

  return (
    <SurfaceListTable
      loading={active.isLoading || active.isFetching}
      dataSource={active.data?.data.rows ?? []}
      showSearch={showSearch}
      searchPlaceholder="Search MPN or description"
      searchValue={search}
      onSearchChange={setSearch}
      error={
        active.error ? <SurfaceListError message="Unable to load parts." /> : undefined
      }
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
          title: "Manufacturer",
          render: (_, row) => {
            const summary = row.summary as PartListSummary | undefined;
            return summary?.display_name ?? "—";
          },
        },
      ]}
    />
  );
};
