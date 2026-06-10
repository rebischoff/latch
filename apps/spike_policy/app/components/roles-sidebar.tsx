"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createRoleAction } from "@/app/actions/roles";
import type { RoleListItem } from "@/lib/iam/list-roles";

type RolesSidebarProps = {
  roles: RoleListItem[];
  selectedId: string | null;
  canManage: boolean;
};

export const RolesSidebar = ({
  roles,
  selectedId,
  canManage,
}: RolesSidebarProps) => {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const selectRole = (roleId: string) => {
    router.push(`/roles?id=${roleId}`);
  };

  const onCreate = async () => {
    const name = newName.trim();
    if (!name) {
      message.error("Display name is required");
      return;
    }
    setCreating(true);
    const result = await createRoleAction(name);
    setCreating(false);
    if (!result.ok) {
      message.error(result.error);
      return;
    }
    message.success("Role created");
    setCreateOpen(false);
    setNewName("");
    router.push(`/roles?id=${result.data.id}`);
    router.refresh();
  };

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
            Roles
          </Typography.Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canManage}
            onClick={() => setCreateOpen(true)}
            block
          >
            New role
          </Button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} role="list">
          {roles.length === 0 ? (
            <Typography.Text type="secondary" style={{ display: "block", padding: "10px 16px" }}>
              No roles
            </Typography.Text>
          ) : (
            roles.map((role) => (
              <div
                key={role.id}
                role="listitem"
                onClick={() => selectRole(role.id)}
                style={{
                  cursor: "pointer",
                  padding: "10px 16px",
                  background:
                    role.id === selectedId
                      ? "rgba(22, 119, 255, 0.08)"
                      : undefined,
                  borderInlineStart:
                    role.id === selectedId
                      ? "3px solid #1677ff"
                      : "3px solid transparent",
                }}
              >
                <Typography.Text
                  ellipsis
                  style={{
                    fontWeight: role.id === selectedId ? 600 : 400,
                  }}
                >
                  {role.displayName}
                </Typography.Text>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        title="New app role"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={creating}
        okText="Create"
      >
        <Input
          placeholder="Display name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onPressEnter={onCreate}
        />
      </Modal>
    </>
  );
};
