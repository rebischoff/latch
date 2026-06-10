"use client";

import { Typography } from "antd";

import { RoleDetailForm } from "@/app/components/role-detail-form";
import { RolesSidebar } from "@/app/components/roles-sidebar";
import type { GrantMatrixSurface } from "@/lib/grant-matrix-vocabulary";
import type { RoleListItem } from "@/lib/iam/list-roles";
import type { ProjectedRoleDetail } from "@/lib/iam/project";

type RolesWorkspaceProps = {
  roles: RoleListItem[];
  selectedId: string | null;
  role: ProjectedRoleDetail | null;
  vocabulary: GrantMatrixSurface[];
  canManage: boolean;
};

export const RolesWorkspace = ({
  roles,
  selectedId,
  role,
  vocabulary,
  canManage,
}: RolesWorkspaceProps) => {
  const listItem = roles.find((row) => row.id === selectedId);
  const readOnly = role?.catalog?.role_class !== "app";

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
      }}
    >
      <aside
        style={{
          width: 280,
          flexShrink: 0,
          minHeight: 0,
          borderRight: "1px solid rgba(0, 0, 0, 0.06)",
          background: "#fafafa",
        }}
      >
        <RolesSidebar
          roles={roles}
          selectedId={selectedId}
          canManage={canManage}
        />
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflowY: "auto",
          padding: 24,
        }}
      >
        {role ? (
          <RoleDetailForm
            key={role.id}
            role={role}
            vocabulary={vocabulary}
            readOnly={readOnly}
            assignmentCount={listItem?.assignmentCount ?? 0}
          />
        ) : (
          <Typography.Text type="secondary">
            Select a role from the list, or create a new one.
          </Typography.Text>
        )}
      </main>
    </div>
  );
};
