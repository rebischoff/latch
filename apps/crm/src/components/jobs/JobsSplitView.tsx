"use client";

import type { Manifest } from "@latch/contracts";
import type { ProjectedJobDetail } from "@/lib/jobs/project";
import type { ProjectedJobListRow } from "@/lib/jobs/list-project";
import { Card, Col, Empty, Result, Row } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { JobDetailPane } from "./JobDetailPane";
import { JobListPane } from "./JobListPane";

export type JobsDetailPayload = {
  job: ProjectedJobDetail;
  manifest: Manifest;
  customerDetailManifest?: Manifest;
  /** When set, field tech must withdraw before proposing a new amount. */
  submitterOpenPendingId?: string;
};

type JobsSplitViewProps = {
  listRows?: ProjectedJobListRow[];
  listTotal?: number;
  listManifest?: Manifest;
  listLoading?: boolean;
  selectedId?: string;
  detail?: JobsDetailPayload;
  notFound?: boolean;
};

export const JobsSplitView = ({
  listRows = [],
  listTotal = 0,
  listManifest,
  listLoading = false,
  selectedId,
  detail,
  notFound,
}: JobsSplitViewProps) => {
  const pathname = usePathname();

  return (
    <Row gutter={16}>
      <Col xs={24} lg={10}>
        <Card title="Jobs" size="small">
          <JobListPane
            rows={listRows}
            total={listTotal}
            manifest={listManifest}
            selectedId={selectedId}
            loading={listLoading}
          />
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
              customerDetailManifest={detail.customerDetailManifest}
              submitterOpenPendingId={detail.submitterOpenPendingId}
            />
          ) : (
            <Empty description="Loading…" />
          )}
        </Card>
      </Col>
    </Row>
  );
};
