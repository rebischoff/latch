"use client";

import { Alert, Typography } from "antd";

type AccessDeniedPanelProps = {
  surfaceLabel: string;
  hint?: string;
};

export const AccessDeniedPanel = ({
  surfaceLabel,
  hint = "Switch Act as to Bootstrap admin (or another principal with system_iam) to open this page.",
}: AccessDeniedPanelProps) => (
  <div style={{ padding: 24, maxWidth: 640 }}>
    <Alert
      type="warning"
      showIcon
      title={`No access to ${surfaceLabel}`}
      description={
        <>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            The current Act as principal does not hold <code>system_iam</code>{" "}
            synthesis on this IAM surface, so the page is hidden (404 semantics).
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {hint}
          </Typography.Paragraph>
        </>
      }
    />
  </div>
);
