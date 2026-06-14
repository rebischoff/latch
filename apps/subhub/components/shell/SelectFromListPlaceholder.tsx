"use client";

import { Empty, Typography } from "antd";

type SelectFromListPlaceholderProps = {
  title: string;
  description: string;
};

export const SelectFromListPlaceholder = ({
  title,
  description,
}: SelectFromListPlaceholderProps) => (
  <Empty
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description={
      <>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </>
    }
  />
);
