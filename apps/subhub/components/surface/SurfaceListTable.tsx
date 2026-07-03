"use client";

import { Input, Table, Typography } from "antd";
import type { TableProps } from "antd";
import type { ReactNode } from "react";

type SurfaceListTableProps<RecordType extends object> = {
  loading?: boolean;
  rowKey?: TableProps<RecordType>["rowKey"];
  dataSource: RecordType[];
  columns: TableProps<RecordType>["columns"];
  rowClassName?: TableProps<RecordType>["rowClassName"];
  onRow?: TableProps<RecordType>["onRow"];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  error?: ReactNode;
};

export const SurfaceListTable = <RecordType extends object>({
  loading,
  rowKey = "id",
  dataSource,
  columns,
  rowClassName,
  onRow,
  searchPlaceholder = "Search",
  searchValue = "",
  onSearchChange,
  showSearch = false,
  error,
}: SurfaceListTableProps<RecordType>) => {
  if (error) {
    return <div style={{ padding: 16 }}>{error}</div>;
  }

  return (
    <div>
      {showSearch && onSearchChange ? (
        <div style={{ padding: "8px 8px 0" }}>
          <Input.Search
            allowClear
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      ) : null}
      <Table<RecordType>
        size="small"
        loading={loading}
        rowKey={rowKey}
        pagination={false}
        dataSource={dataSource}
        rowClassName={rowClassName}
        onRow={onRow}
        columns={columns}
      />
    </div>
  );
};

export const SurfaceListError = ({ message }: { message: string }) => (
  <Typography.Text type="danger">{message}</Typography.Text>
);
