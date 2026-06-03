"use client";

import type { Manifest } from "@latch/contracts";
import type { ProjectedCustomerDetail } from "@/lib/customers/project";
import { Card, Col, Empty, Row } from "antd";

import { CustomerDetailPane } from "./CustomerDetailPane";

export type CustomersDetailPayload = {
  customer: ProjectedCustomerDetail;
  manifest: Manifest;
};

type CustomersSplitViewProps = {
  customerId?: string;
  detail?: CustomersDetailPayload;
  detailLoading?: boolean;
};

export const CustomersSplitView = ({
  customerId,
  detail,
  detailLoading = false,
}: CustomersSplitViewProps) => (
  <Row gutter={16}>
    <Col xs={24} lg={10}>
      <Card title="Customers" size="small">
        <Empty description="Open a customer from a job" />
      </Card>
    </Col>
    <Col xs={24} lg={14}>
      <Card title="Customer detail" size="small">
        {!customerId ? (
          <Empty description="Add ?id= to the URL to view a customer" />
        ) : detail ? (
          <CustomerDetailPane
            customerId={customerId}
            customer={detail.customer}
            manifest={detail.manifest}
          />
        ) : detailLoading ? (
          <Empty description="Loading…" />
        ) : (
          <Empty description="Loading…" />
        )}
      </Card>
    </Col>
  </Row>
);
