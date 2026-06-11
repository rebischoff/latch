"use client";

import { PlusOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Input, Modal, Select, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { createUserAction } from "@/app/actions/users";
import type { RoleListItem } from "@/lib/iam/list-roles";
import type { UserListItem } from "@/lib/iam-user/list-users-pg";
import type { ScopeListItem } from "@/lib/iam-user/list-scopes";
import {
  userCreateFormValuesToInput,
  type UserCreateFormValues,
} from "@/lib/iam-user/user-form";

const UserCreateFormSchema = z.object({
  id: z.string().trim().min(1, "User id is required"),
  display_name: z.string().trim().min(1, "Display name is required"),
  role_ids: z.array(z.string().uuid()),
  scope_id: z.string().uuid().nullable(),
});

type UsersSidebarProps = {
  users: UserListItem[];
  selectedId: string | null;
  roles: RoleListItem[];
  scopes: ScopeListItem[];
  canCreate: boolean;
};

export const UsersSidebar = ({
  users,
  selectedId,
  roles,
  scopes,
  canCreate,
}: UsersSidebarProps) => {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const scopeRequired = scopes.length > 0;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<UserCreateFormValues>({
    resolver: zodResolver(UserCreateFormSchema),
    defaultValues: {
      id: "",
      display_name: "",
      role_ids: [],
      scope_id: null,
    },
  });

  const selectUser = (userId: string) => {
    router.push(`/users?id=${userId}`);
  };

  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: `${role.displayName} (${role.roleClass})`,
  }));

  const scopeOptions = scopes.map((scope) => ({
    value: scope.id,
    label: scope.displayName,
  }));

  const onCreate = handleSubmit(async (values) => {
    const result = await createUserAction(userCreateFormValuesToInput(values));
    if (!result.ok) {
      message.error(result.error);
      return;
    }
    message.success("User created");
    setCreateOpen(false);
    reset();
    router.push(`/users/${result.data.user.id}`);
    router.refresh();
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
            flexShrink: 0,
          }}
        >
          <Typography.Title level={5} style={{ margin: "0 0 12px" }}>
            Users
          </Typography.Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canCreate}
            onClick={() => setCreateOpen(true)}
            block
          >
            + Add
          </Button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} role="list">
          {users.length === 0 ? (
            <Typography.Text type="secondary" style={{ display: "block", padding: "10px 16px" }}>
              No users
            </Typography.Text>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                role="listitem"
                onClick={() => selectUser(user.id)}
                style={{
                  cursor: "pointer",
                  padding: "10px 16px",
                  background:
                    user.id === selectedId
                      ? "rgba(22, 119, 255, 0.08)"
                      : undefined,
                  borderInlineStart:
                    user.id === selectedId
                      ? "3px solid #1677ff"
                      : "3px solid transparent",
                }}
              >
                <Typography.Text
                  ellipsis
                  style={{
                    fontWeight: user.id === selectedId ? 600 : 400,
                  }}
                >
                  {user.displayName}
                </Typography.Text>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        title="Add user"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          reset();
        }}
        onOk={onCreate}
        confirmLoading={isSubmitting}
        okText="Create"
      >
        <form onSubmit={onCreate}>
          <Form.Item label="User id" required style={{ marginBottom: 16 }}>
            <Controller
              name="id"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    placeholder="e.g. new-user"
                    status={fieldState.error ? "error" : undefined}
                  />
                  {fieldState.error ? (
                    <Typography.Text type="danger">
                      {fieldState.error.message}
                    </Typography.Text>
                  ) : null}
                </>
              )}
            />
          </Form.Item>

          <Form.Item label="Display name" required style={{ marginBottom: 16 }}>
            <Controller
              name="display_name"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    placeholder="Display name"
                    status={fieldState.error ? "error" : undefined}
                  />
                  {fieldState.error ? (
                    <Typography.Text type="danger">
                      {fieldState.error.message}
                    </Typography.Text>
                  ) : null}
                </>
              )}
            />
          </Form.Item>

          <Form.Item label="Initial roles" style={{ marginBottom: scopeRequired ? 16 : 0 }}>
            <Controller
              name="role_ids"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  mode="multiple"
                  options={roleOptions}
                  placeholder="Optional — assign later on the detail page"
                  style={{ width: "100%" }}
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                />
              )}
            />
          </Form.Item>

          {scopeRequired ? (
            <Form.Item label="Scope" style={{ marginBottom: 0 }}>
              <Controller
                name="scope_id"
                control={control}
                render={({ field }) => (
                  <Select
                    options={scopeOptions}
                    placeholder="Branch scope for app roles"
                    style={{ width: "100%" }}
                    value={field.value ?? undefined}
                    onChange={(value) => field.onChange(value ?? null)}
                    allowClear
                  />
                )}
              />
            </Form.Item>
          ) : null}
        </form>
      </Modal>
    </>
  );
};
