"use client";

import type { Manifest, SurfaceId } from "@latch/contracts";
import { Typography } from "antd";

import { UserDetailForm } from "@/app/components/user-detail-form";
import { UsersSidebar } from "@/app/components/users-sidebar";
import type { RoleListItem } from "@/lib/iam/list-roles";
import type { UserListItem } from "@/lib/iam-user/list-users-pg";
import type { ProjectedUserRolesDetail } from "@/lib/iam-user/project";

type UsersWorkspaceProps = {
  users: UserListItem[];
  selectedId: string | null;
  user: ProjectedUserRolesDetail | null;
  roles: RoleListItem[];
  manifests: Record<SurfaceId, Manifest> | null;
  iamSurfaceIds: readonly string[];
  canCreate: boolean;
  canWrite: boolean;
  isSelf: boolean;
};

export const UsersWorkspace = ({
  users,
  selectedId,
  user,
  roles,
  manifests,
  iamSurfaceIds,
  canCreate,
  canWrite,
  isSelf,
}: UsersWorkspaceProps) => (
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
      <UsersSidebar
        users={users}
        selectedId={selectedId}
        roles={roles}
        canCreate={canCreate}
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
      {user && manifests ? (
        <UserDetailForm
          key={user.id}
          user={user}
          roles={roles}
          manifests={manifests}
          iamSurfaceIds={iamSurfaceIds}
          canWrite={canWrite}
          isSelf={isSelf}
        />
      ) : (
        <Typography.Text type="secondary">
          Select a user from the list.
        </Typography.Text>
      )}
    </main>
  </div>
);
