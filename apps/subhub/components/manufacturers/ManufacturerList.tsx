"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SurfaceListError,
  SurfaceListTable,
} from "@/components/surface/SurfaceListTable";
import { fieldAllows } from "@latch/contracts";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { useSurfaceListSearch } from "@/lib/hooks/use-surface-list-search";
import { routes } from "@/lib/nav-routes";

type ManufacturerListSummary = {
  display_name?: string | null;
  kind?: string | null;
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

export const ManufacturerList = () => {
  const pathname = usePathname();
  const baseList = useSurfaceList("manufacturer_list");
  const { search, setSearch, showSearch, listQuery } = useSurfaceListSearch(
    baseList.data?.manifest,
  );
  const searchList = useSurfaceList("manufacturer_list", listQuery);
  const active = listQuery ? searchList : baseList;
  const listManifest = active.data?.manifest;
  const showKind =
    listManifest !== undefined && fieldAllows(listManifest, "summary", "read");

  return (
    <SurfaceListTable
      loading={active.isLoading || active.isFetching}
      dataSource={active.data?.data.rows ?? []}
      showSearch={showSearch}
      searchPlaceholder="Search name or legal name"
      searchValue={search}
      onSearchChange={setSearch}
      error={
        active.error ? <SurfaceListError message="Unable to load manufacturers." /> : undefined
      }
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
  );
};
