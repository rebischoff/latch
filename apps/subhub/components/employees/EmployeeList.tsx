"use client";

import { Input, Table, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { fieldAllows } from "@latch/contracts";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

type EmployeeListSummary = {
  display_name?: string | null;
};

type EmployeeListRow = {
  id: string;
  summary?: EmployeeListSummary;
};

const employeeLabel = (row: {
  summary?: EmployeeListSummary;
  id: string;
}): string => row.summary?.display_name ?? row.id;

export const EmployeeList = () => {
  const pathname = usePathname();
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
    "employee_list",
    listQuery,
  );

  const listManifest = data?.manifest;
  const showSearch =
    listManifest !== undefined && fieldAllows(listManifest, "summary", "read");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load employees.</Typography.Text>
      </div>
    );
  }

  return (
    <div>
      {showSearch ? (
        <div style={{ padding: "8px 8px 0" }}>
          <Input.Search
            allowClear
            placeholder="Search name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      ) : null}
      <Table<EmployeeListRow>
        size="small"
        loading={isLoading || isFetching}
        rowKey="id"
        pagination={false}
        dataSource={(data?.data.rows ?? []) as EmployeeListRow[]}
        rowClassName={(record) =>
          pathname === routes.employees.detail(record.id) ? "ant-table-row-selected" : ""
        }
        onRow={() => ({
          style: { cursor: "pointer" },
        })}
        columns={[
          {
            title: "Name",
            render: (_, row) => (
              <Link href={routes.employees.detail(row.id)}>{employeeLabel(row)}</Link>
            ),
          },
        ]}
      />
    </div>
  );
};
