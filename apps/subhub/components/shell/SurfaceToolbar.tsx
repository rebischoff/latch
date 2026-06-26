"use client";

import { MoreOutlined } from "@ant-design/icons";
import {
  fieldAllows,
  surfaceAllows,
  type FieldAction,
  type FieldId,
  type Manifest,
} from "@latch/contracts";
import { Button, Dropdown, Flex, Grid, Space, Tooltip, type MenuProps } from "antd";
import type { ReactNode, RefObject } from "react";

export type ToolbarAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  priority: "primary" | "secondary";
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  surfaceAction?: FieldAction;
  field?: FieldId;
  fieldAction?: FieldAction;
};

type SurfaceToolbarProps = {
  manifest: Manifest;
  actions: ToolbarAction[];
  /** Resolve clicks from the latest registration ref (avoids stale toolbar handlers). */
  liveRegistrationRef?: RefObject<{ actions: ToolbarAction[] } | null>;
};

const isActionGranted = (manifest: Manifest, action: ToolbarAction): boolean => {
  if (action.surfaceAction) {
    return surfaceAllows(manifest, action.surfaceAction);
  }

  if (action.field && action.fieldAction) {
    return fieldAllows(manifest, action.field, action.fieldAction);
  }

  return true;
};

export const SurfaceToolbar = ({
  manifest,
  actions,
  liveRegistrationRef,
}: SurfaceToolbarProps) => {
  const screens = Grid.useBreakpoint();
  const compact = !screens.lg;

  const granted = actions.filter((action) => isActionGranted(manifest, action));
  if (granted.length === 0) {
    return null;
  }

  const invokeAction = (action: ToolbarAction) => {
    const latest = liveRegistrationRef?.current?.actions.find(
      (candidate) => candidate.key === action.key,
    );
    (latest ?? action).onClick();
  };

  const primary = granted.filter((action) => action.priority === "primary");
  const secondary = granted.filter((action) => action.priority === "secondary");

  const renderButton = (action: ToolbarAction, iconOnly = false) => {
    const button = (
      <Button
        key={action.key}
        type={action.danger ? "default" : action.priority === "primary" ? "primary" : "default"}
        danger={action.danger}
        icon={action.icon}
        disabled={action.disabled}
        loading={action.loading}
        onClick={() => invokeAction(action)}
      >
        {iconOnly ? null : action.label}
      </Button>
    );

    return iconOnly ? (
      <Tooltip key={action.key} title={action.label}>
        {button}
      </Tooltip>
    ) : (
      button
    );
  };

  const overflowItems: MenuProps["items"] = secondary.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    disabled: action.disabled,
    onClick: () => invokeAction(action),
  }));

  const showOverflow = compact && secondary.length > 0;
  const inlineSecondary = !compact ? secondary : [];

  return (
    <Flex justify="flex-end">
      <Space wrap>
        {primary.map((action) => renderButton(action, compact))}
        {inlineSecondary.map((action) => renderButton(action))}
        {showOverflow ? (
          <Dropdown menu={{ items: overflowItems }} trigger={["click"]}>
            <Button icon={<MoreOutlined />} aria-label="More actions" />
          </Dropdown>
        ) : null}
      </Space>
    </Flex>
  );
};
