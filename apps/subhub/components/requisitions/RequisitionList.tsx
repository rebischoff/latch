"use client";

import { Select, Space, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "on_purchase_order", label: "On PO" },
  { value: "fulfilled", label: "Fulfilled" },
] as const;

const statusColor = (status: string): string => {
  switch (status) {
    case "open":
      return "processing";
    case "on_purchase_order":
      return "warning";
    case "fulfilled":
      return "success";
    default:
      return "default";
  }
};

type Summary = {
  title?: string | null;
  job_id?: string | null;
  name?: string | null;
  site_zone_id?: string | null;
  mpn?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  status?: string | null;
  requested_at?: string | null;
};

export const RequisitionList = () => {
  const [jobId, setJobId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [siteZoneId, setSiteZoneId] = useState<string | undefined>();

  const query = useMemo(() => {
    const q: Record<string, string | undefined> = {};
    if (jobId) q.job_id = jobId;
    if (status) q.status = status;
    if (siteZoneId !== undefined) q.site_zone_id = siteZoneId;
    return q;
  }, [jobId, status, siteZoneId]);

  const { data, isLoading, error } = useSurfaceList(
    "job_material_request_list",
    query,
  );

  const jobOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of data?.data.rows ?? []) {
      const summary = row.summary as Summary | undefined;
      if (summary?.job_id) {
        map.set(summary.job_id, summary.title ?? summary.job_id);
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [data?.data.rows]);

  const zoneOptions = useMemo(() => {
    const map = new Map<string, string>();
    map.set("general", "General");
    for (const row of data?.data.rows ?? []) {
      const summary = row.summary as Summary | undefined;
      if (summary?.site_zone_id) {
        map.set(summary.site_zone_id, summary.name ?? summary.site_zone_id);
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [data?.data.rows]);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load material requests.</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Job"
          style={{ minWidth: 220 }}
          options={jobOptions}
          value={jobId}
          onChange={(value) => setJobId(value)}
        />
        <Select
          allowClear
          placeholder="Status"
          style={{ minWidth: 160 }}
          options={[...STATUS_OPTIONS]}
          value={status}
          onChange={(value) => setStatus(value)}
        />
        <Select
          allowClear
          placeholder="Zone"
          style={{ minWidth: 180 }}
          options={zoneOptions}
          value={siteZoneId}
          onChange={(value) => setSiteZoneId(value)}
        />
      </Space>
      <Table
        size="small"
        loading={isLoading}
        rowKey="id"
        pagination={false}
        dataSource={data?.data.rows ?? []}
        columns={[
          {
            title: "Job",
            render: (_, row) => {
              const summary = row.summary as Summary | undefined;
              return summary?.title ?? summary?.job_id ?? row.id;
            },
          },
          {
            title: "Zone",
            width: 140,
            render: (_, row) => {
              const summary = row.summary as Summary | undefined;
              return summary?.site_zone_id
                ? (summary.name ?? summary.site_zone_id)
                : "General";
            },
          },
          {
            title: "Part / description",
            render: (_, row) => {
              const summary = row.summary as Summary | undefined;
              if (summary?.mpn) {
                return summary.description
                  ? `${summary.mpn} — ${summary.description}`
                  : summary.mpn;
              }
              return summary?.description || "—";
            },
          },
          {
            title: "Qty",
            width: 90,
            render: (_, row) => {
              const summary = row.summary as Summary | undefined;
              const qty = summary?.quantity;
              const unit = summary?.unit ?? "ea";
              return qty != null ? `${qty} ${unit}` : "—";
            },
          },
          {
            title: "Status",
            width: 130,
            render: (_, row) => {
              const summary = row.summary as Summary | undefined;
              const s = summary?.status ?? "open";
              return <Tag color={statusColor(s)}>{s}</Tag>;
            },
          },
          {
            title: "Requested",
            width: 120,
            render: (_, row) => {
              const summary = row.summary as Summary | undefined;
              return summary?.requested_at
                ? new Date(summary.requested_at).toLocaleDateString()
                : "—";
            },
          },
        ]}
      />
    </div>
  );
};
