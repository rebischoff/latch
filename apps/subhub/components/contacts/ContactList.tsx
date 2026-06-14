"use client";

import type { SurfaceId } from "@latch/contracts";
import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

const contactLabel = (row: {
  summary?: {
    display_name?: string | null;
    kind?: string | null;
  };
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

export type ContactListProps = {
  surfaceId?: SurfaceId;
  detailHref?: (id: string) => string;
};

export const ContactList = ({
  surfaceId = "contact_list",
  detailHref = routes.contacts.detail,
}: ContactListProps) => {
  const pathname = usePathname();
  const { data, isLoading, error } = useSurfaceList(surfaceId);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load contacts.</Typography.Text>
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
        pathname === detailHref(record.id) ? "ant-table-row-selected" : ""
      }
      onRow={(record) => ({
        style: { cursor: "pointer" },
      })}
      columns={[
        {
          title: "Name",
          render: (_, row) => (
            <Link href={detailHref(row.id)}>{contactLabel(row)}</Link>
          ),
        },
        {
          title: "Kind",
          render: (_, row) => kindLabel(row.summary?.kind),
        },
      ]}
    />
  );
};
