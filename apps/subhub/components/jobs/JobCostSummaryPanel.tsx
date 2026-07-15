"use client";

import { Descriptions, Typography } from "antd";

import type { JobCostSummary } from "@/lib/jobs/repository/job-cost-summary";

const money = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

type JobCostSummaryPanelProps = {
  summary: JobCostSummary | undefined;
};

/** Read-only job cost layers (task 45 Step 6). */
export const JobCostSummaryPanel = ({ summary }: JobCostSummaryPanelProps) => {
  if (!summary) {
    return null;
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Cost summary
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Contract, budget, and material actuals. Labor $ actuals deferred. Committed /
        actual require procurement tables.
      </Typography.Paragraph>
      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="Contract">{money(summary.contract)}</Descriptions.Item>
        <Descriptions.Item label="Budget">{money(summary.budget)}</Descriptions.Item>
        <Descriptions.Item label="Re-budgeted">
          {money(summary.rebudgeted)}
        </Descriptions.Item>
        <Descriptions.Item label="Committed">{money(summary.committed)}</Descriptions.Item>
        <Descriptions.Item label="Actual (material)">
          {money(summary.actual_material)}
        </Descriptions.Item>
        <Descriptions.Item label="Margin vs budget">
          {money(summary.margin_vs_budget)}
        </Descriptions.Item>
        <Descriptions.Item label="Margin vs re-budgeted">
          {money(summary.margin_vs_rebudgeted)}
        </Descriptions.Item>
        <Descriptions.Item label="Margin vs actual">
          {money(summary.margin_vs_actual)}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
};
