"use client";

import { DownOutlined, MoreOutlined } from "@ant-design/icons";
import {
  fieldAllows,
  surfaceAllows,
  type FieldAction,
  type FieldId,
  type Manifest,
} from "@latch/contracts";
import { Button, Dropdown, Flex, Grid, Space, Tooltip, type MenuProps } from "antd";
import type { ReactNode, RefObject } from "react";

type ToolbarButtonAction = {
  variant?: "button";
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

type ToolbarDropdownAction = {
  variant: "dropdown";
  key: string;
  label: string;
  icon?: ReactNode;
  priority: "primary" | "secondary";
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  trigger?: "click" | "hover";
  menu: MenuProps["items"];
  surfaceAction?: FieldAction;
  field?: FieldId;
  fieldAction?: FieldAction;
};

export type ToolbarAction = ToolbarButtonAction | ToolbarDropdownAction;

type SurfaceToolbarProps = {
  manifest: Manifest;
  actions: ToolbarAction[];
  /** Resolve clicks from the latest registration ref (avoids stale toolbar handlers). */
  liveRegistrationRef?: RefObject<{ actions: ToolbarAction[] } | null>;
};

const isDropdownAction = (action: ToolbarAction): action is ToolbarDropdownAction =>
  action.variant === "dropdown";

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

  const resolveAction = (action: ToolbarAction): ToolbarAction => {
    const latest = liveRegistrationRef?.current?.actions.find(
      (candidate) => candidate.key === action.key,
    );
    return latest ?? action;
  };

  const invokeAction = (action: ToolbarButtonAction) => {
    const latest = resolveAction(action);
    if (!isDropdownAction(latest)) {
      latest.onClick();
    }
  };

  const primary = granted.filter((action) => action.priority === "primary");
  const secondary = granted.filter((action) => action.priority === "secondary");

  const renderButton = (action: ToolbarButtonAction, iconOnly = false) => {
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

  const renderDropdown = (action: ToolbarDropdownAction, iconOnly = false) => {
    const latest = resolveAction(action);
    if (!isDropdownAction(latest)) {
      return renderButton(latest, iconOnly);
    }

    const button = (
      <Button
        key={latest.key}
        type={latest.danger ? "default" : latest.priority === "primary" ? "primary" : "default"}
        danger={latest.danger}
        icon={latest.icon}
        disabled={latest.disabled}
        loading={latest.loading}
      >
        {iconOnly ? null : (
          <Space size={4}>
            {latest.label}
            <DownOutlined />
          </Space>
        )}
      </Button>
    );

    const trigger: ("click" | "hover")[] =
      latest.trigger === "hover" ? ["hover"] : ["click"];

    return (
      <Dropdown key={latest.key} menu={{ items: latest.menu }} trigger={trigger}>
        {iconOnly ? (
          <Tooltip title={latest.label}>{button}</Tooltip>
        ) : (
          button
        )}
      </Dropdown>
    );
  };

  const renderAction = (action: ToolbarAction, iconOnly = false) =>
    isDropdownAction(action)
      ? renderDropdown(action, iconOnly)
      : renderButton(action, iconOnly);

  const overflowItems: MenuProps["items"] = secondary
    .filter((action): action is ToolbarButtonAction => !isDropdownAction(action))
    .map((action) => ({
      key: action.key,
      label: action.label,
      icon: action.icon,
      danger: action.danger,
      disabled: action.disabled,
      onClick: () => invokeAction(action),
    }));

  const showOverflow = compact && overflowItems.length > 0;
  const inlineSecondary = !compact ? secondary : [];

  return (
    <Flex justify="flex-end">
      <Space wrap>
        {primary.map((action) => renderAction(action, compact))}
        {inlineSecondary.map((action) => renderAction(action))}
        {showOverflow ? (
          <Dropdown menu={{ items: overflowItems }} trigger={["click"]}>
            <Button icon={<MoreOutlined />} aria-label="More actions" />
          </Dropdown>
        ) : null}
      </Space>
    </Flex>
  );
};
