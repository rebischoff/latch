"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Manifest, SurfaceId } from "@latch/contracts";
import {
  Alert,
  Button,
  Card,
  Form,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { patchUserAssignmentsAction } from "@/app/actions/users";
import { ManifestInspector } from "@/app/components/manifest-inspector";
import type { RoleListItem } from "@/lib/iam/list-roles";
import type { ProjectedUserRolesDetail } from "@/lib/iam-user/project";
import {
  userDetailToFormValues,
  userFormValuesToPatch,
  type UserDetailFormValues,
} from "@/lib/iam-user/user-form";

const UserFormSchema = z.object({
  display_name: z.string().optional(),
  role_assignments: z.array(z.string().uuid()),
});

type UserDetailFormProps = {
  user: ProjectedUserRolesDetail;
  roles: RoleListItem[];
  manifests: Record<SurfaceId, Manifest>;
  iamSurfaceIds: readonly string[];
  canWrite: boolean;
  isSelf: boolean;
};

export const UserDetailForm = ({
  user,
  roles,
  manifests: initialManifests,
  iamSurfaceIds,
  canWrite,
  isSelf,
}: UserDetailFormProps) => {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [manifests, setManifests] = useState(initialManifests);

  const displayName = user.profile?.display_name ?? user.id;
  const saveDisabled = !canWrite || isSelf;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<UserDetailFormValues>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: userDetailToFormValues(user),
  });

  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: `${role.displayName} (${role.roleClass})`,
  }));

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const patch = userFormValuesToPatch(values);
    const result = await patchUserAssignmentsAction(user.id, patch.role_assignments);
    if (!result.ok) {
      setSubmitError(result.error);
      message.error(result.error);
      return;
    }
    setManifests(result.data.manifests);
    message.success("Assignments saved");
    router.refresh();
  });

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      {submitError ? <Alert type="error" title={submitError} showIcon /> : null}
      {isSelf ? (
        <Alert
          type="info"
          showIcon
          title="You cannot edit your own role assignments (self-patch denied)."
          description="Select another user in the sidebar to change their roles."
        />
      ) : null}

      <form onSubmit={onSubmit}>
        <Card title="User">
          <Form.Item label="Display name" style={{ maxWidth: 480 }}>
            <Typography.Text>{displayName}</Typography.Text>
          </Form.Item>

          <Form.Item label="Roles" style={{ maxWidth: 640 }}>
            <Controller
              name="role_assignments"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  mode="multiple"
                  disabled={saveDisabled}
                  options={roleOptions}
                  placeholder="Select one or more roles"
                  style={{ width: "100%" }}
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                />
              )}
            />
          </Form.Item>

          <Typography.Paragraph type="secondary">
            Merged effective access is shown in the inspector below.
          </Typography.Paragraph>

          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={saveDisabled}
          >
            Save assignments
          </Button>
        </Card>
      </form>

      <Card
        title="Effective permissions"
        extra={
          <Typography.Text type="secondary">
            PolicyService.resolve for this user — merged across roles
          </Typography.Text>
        }
      >
        <Typography.Paragraph type="secondary">
          Refreshes automatically after Save. Ungranted fields show as (none).
        </Typography.Paragraph>
        <ManifestInspector manifests={manifests} iamSurfaceIds={iamSurfaceIds} />
      </Card>
    </Space>
  );
};
