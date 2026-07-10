"use client";

import { Flex, Space, Tabs, Typography } from "antd";
import type { TabsProps } from "antd";
import type { ReactNode } from "react";

type DetailHeaderProps = {
  title: ReactNode;
  /** Chips/badges beside title (status, staff, etc.) */
  tags?: ReactNode;
} & Pick<TabsProps, "items" | "activeKey" | "onChange">;

const TitleBlock = ({ title, tags }: Pick<DetailHeaderProps, "title" | "tags">) => (
  <Flex align="center" gap={8} style={{ marginRight: 24 }}>
    <Typography.Title level={4} style={{ margin: 0, whiteSpace: "nowrap" }}>
      {title}
    </Typography.Title>
    {tags ? <Space size={4}>{tags}</Space> : null}
  </Flex>
);

/** Title (+ optional tags) on the same row as tab navigation when tabs are present. */
export const DetailHeader = ({ title, tags, items, activeKey, onChange }: DetailHeaderProps) => {
  if (!items?.length) {
    return <TitleBlock title={title} tags={tags} />;
  }

  return (
    <Tabs
      activeKey={activeKey}
      onChange={onChange}
      items={items}
      tabBarExtraContent={{ left: <TitleBlock title={title} tags={tags} /> }}
      tabBarStyle={{ marginBottom: 0 }}
    />
  );
};
