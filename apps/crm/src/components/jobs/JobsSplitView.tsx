"use client";

import type { Manifest } from "@latch/contracts";
import type { ProjectedJobDetail } from "@latch/dal";
import { SEED_JOB_OTHER, SEED_JOB_OWNED } from "@latch/dal";
import { Card, Col, Empty, Result, Row, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { JobDetailPane } from "./JobDetailPane";

const PLACEHOLDER_JOBS = [
  { id: SEED_JOB_OWNED, label: "Panel upgrade — 123 Main St" },
  { id: SEED_JOB_OTHER, label: "HVAC install — 456 Oak Ave" },
] as const;

export type JobsDetailPayload = {
  job: ProjectedJobDetail;
  manifest: Manifest;
};

type JobsSplitViewProps = {
  selectedId?: string;
  /** Job ids the principal may open (row scope); omit only during loading fallback. */
  visibleJobIds?: string[];
  detail?: JobsDetailPayload;
  notFound?: boolean;
};

export const JobsSplitView = ({
  selectedId,
  visibleJobIds,
  detail,
  notFound,
}: JobsSplitViewProps) => {
  const pathname = usePathname();
  const visibleJobs = PLACEHOLDER_JOBS.filter((item) =>
    visibleJobIds ? visibleJobIds.includes(item.id) : true,
  );

  return (
    <Row gutter={16}>
      <Col xs={24} lg={10}>
        <Card title="Jobs" size="small">
          <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
            List pane placeholder — seed jobs for detail testing until Step
            B-list.
          </Typography.Paragraph>
          {visibleJobs.length === 0 ? (
            <Empty description="No jobs" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {visibleJobs.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background:
                      selectedId === item.id
                        ? "rgba(22, 119, 255, 0.08)"
                        : undefined,
                    borderRadius: 4,
                    padding: "6px 8px",
                  }}
                >
                  <Link href={`${pathname}?id=${item.id}`}>{item.label}</Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Col>
      <Col xs={24} lg={14}>
        <Card title="Job detail" size="small">
          {!selectedId ? (
            <Empty description="Select a job to view details" />
          ) : notFound ? (
            <Result
              status="404"
              title="Job not found"
              subTitle="You may not have access to this job, or it was deleted."
              extra={<Link href={pathname}>Clear selection</Link>}
            />
          ) : detail ? (
            <JobDetailPane
              jobId={selectedId}
              job={detail.job}
              manifest={detail.manifest}
            />
          ) : (
            <Empty description="Loading…" />
          )}
        </Card>
      </Col>
    </Row>
  );
};
