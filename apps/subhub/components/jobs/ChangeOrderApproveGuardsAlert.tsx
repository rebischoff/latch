"use client";

import { Alert, List, Typography } from "antd";

import type { ChangeOrderApprovePreview } from "@/lib/jobs/repository/change-order-write";

type ChangeOrderApproveGuardsAlertProps = {
  preview: ChangeOrderApprovePreview | undefined;
};

/**
 * Surfaces C5 block/warn state before CO approve commit (task 45 Step 6).
 * Wave 5d mounts this on the approve confirmation.
 */
export const ChangeOrderApproveGuardsAlert = ({
  preview,
}: ChangeOrderApproveGuardsAlertProps) => {
  if (!preview) {
    return null;
  }

  const { blocked, warned } = preview;
  if (blocked.length === 0 && warned.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {blocked.length > 0 ? (
        <Alert
          type="error"
          showIcon
          message="Cannot approve — committed material on BOM"
          description={
            <>
              <Typography.Paragraph style={{ marginBottom: 8 }}>
                Resolve procurement (return / keep as surplus) before re-approving.
              </Typography.Paragraph>
              <List
                size="small"
                dataSource={blocked}
                renderItem={(item) => (
                  <List.Item>
                    Line {item.change_order_line_id.slice(0, 8)}… ({item.line_action}) —
                    BOM {item.bom_statuses.filter((s) => s !== "open").join(", ")}
                  </List.Item>
                )}
              />
            </>
          }
        />
      ) : null}
      {warned.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          message="Field progress on deducted / revised lines"
          description={
            <>
              <Typography.Paragraph style={{ marginBottom: 8 }}>
                Completed qty is preserved as an audit trail; approve is not blocked.
              </Typography.Paragraph>
              <List
                size="small"
                dataSource={warned}
                renderItem={(item) => (
                  <List.Item>
                    Line {item.change_order_line_id.slice(0, 8)}… ({item.line_action}) —
                    completed qty {item.completed_qty_total}
                  </List.Item>
                )}
              />
            </>
          }
        />
      ) : null}
    </div>
  );
};
