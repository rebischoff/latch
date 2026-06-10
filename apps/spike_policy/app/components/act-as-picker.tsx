"use client";

import { Select, Typography } from "antd";

import { setActAsAction } from "@/app/actions/act-as";
import type { ActAsUserOption } from "@/lib/iam-user/list-users";

type ActAsPickerProps = {
  users: ActAsUserOption[];
  currentUserId: string;
  roleCount: number;
};

export const ActAsPicker = ({
  users,
  currentUserId,
  roleCount,
}: ActAsPickerProps) => {
  const roleLabel = `${roleCount} role${roleCount === 1 ? "" : "s"}`;

  return (
    <div className="act-as-picker">
      <Typography.Text className="act-as-picker__label">Act as</Typography.Text>
      <Select
        aria-label="Act as"
        size="small"
        variant="borderless"
        value={currentUserId}
        className="act-as-picker__select"
        popupMatchSelectWidth={false}
        options={users.map((user) => ({
          value: user.id,
          label: user.displayName,
        }))}
        onChange={(userId) => {
          void setActAsAction(userId);
        }}
      />
      <Typography.Text className="act-as-picker__meta" title="Dev harness only">
        {roleLabel}
      </Typography.Text>
    </div>
  );
};
