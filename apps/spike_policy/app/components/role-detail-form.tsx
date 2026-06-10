"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  Form,
  Input,
  Popconfirm,
  Radio,
  Space,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  deleteRoleAction,
  patchRoleAction,
} from "@/app/actions/roles";
import type { GrantMatrixSurface } from "@/lib/grant-matrix-vocabulary";
import {
  roleDetailToFormValues,
  roleFormValuesToPatch,
  type RoleFormValues,
} from "@/lib/iam/role-form";
import type { ProjectedRoleDetail } from "@/lib/iam/project";

const RoleFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  surfaces: z.record(
    z.object({
      bound: z.boolean(),
      rowScope: z.enum(["own", "all"]).nullable(),
      fieldGrants: z.record(z.record(z.boolean())),
      surfaceActions: z.record(z.boolean()),
    }),
  ),
});

type RoleDetailFormProps = {
  role: ProjectedRoleDetail;
  vocabulary: GrantMatrixSurface[];
  readOnly: boolean;
  assignmentCount: number;
};

export const RoleDetailForm = ({
  role,
  vocabulary,
  readOnly,
  assignmentCount,
}: RoleDetailFormProps) => {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues = roleDetailToFormValues(role, vocabulary);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(RoleFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const patch = roleFormValuesToPatch(values, vocabulary);
    const result = await patchRoleAction(role.id, patch);
    if (!result.ok) {
      setSubmitError(result.error);
      message.error(result.error);
      return;
    }
    message.success("Role saved");
    router.refresh();
  });

  const onDelete = async () => {
    setSubmitError(null);
    const result = await deleteRoleAction(role.id);
    if (!result.ok) {
      setSubmitError(result.error);
      message.error(result.error);
      return;
    }
    message.success("Role deleted");
    router.push("/roles");
    router.refresh();
  };

  const surfaces = watch("surfaces");

  const collapseItems = vocabulary.map((surface) => {
    const surfaceState = surfaces[surface.surfaceId];
    const bound = surfaceState?.bound ?? false;

    return {
      key: surface.surfaceId,
      label: (
        <Space>
          <Controller
            name={`surfaces.${surface.surfaceId}.bound`}
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                disabled={readOnly}
                onChange={(event) => {
                  event.stopPropagation();
                  field.onChange(event.target.checked);
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <Typography.Text code>{surface.surfaceId}</Typography.Text>
              </Checkbox>
            )}
          />
        </Space>
      ),
      children: bound ? (
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Form.Item label="Row scope" style={{ marginBottom: 0 }}>
            <Controller
              name={`surfaces.${surface.surfaceId}.rowScope`}
              control={control}
              render={({ field }) => (
                <Radio.Group
                  disabled={readOnly}
                  value={field.value ?? undefined}
                  onChange={(event) => field.onChange(event.target.value)}
                  options={[
                    { label: "own", value: "own" },
                    { label: "all", value: "all" },
                  ]}
                />
              )}
            />
          </Form.Item>

          {surface.surfaceActions.length > 0 ? (
            <div>
              <Typography.Text type="secondary">Surface actions</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  {surface.surfaceActions.map((action) => (
                    <Controller
                      key={action}
                      name={`surfaces.${surface.surfaceId}.surfaceActions.${action}`}
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          disabled={readOnly}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                        >
                          {action}
                        </Checkbox>
                      )}
                    />
                  ))}
                </Space>
              </div>
            </div>
          ) : null}

          {surface.fieldIds.map((fieldId) => (
            <div key={fieldId}>
              <Typography.Text type="secondary">{fieldId}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  {surface.fieldActions.map((action) => (
                    <Controller
                      key={action}
                      name={`surfaces.${surface.surfaceId}.fieldGrants.${fieldId}.${action}`}
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          disabled={readOnly}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                        >
                          {action}
                        </Checkbox>
                      )}
                    />
                  ))}
                </Space>
              </div>
            </div>
          ))}
        </Space>
      ) : (
        <Typography.Text type="secondary">
          Bind this surface to configure row scope and grants.
        </Typography.Text>
      ),
    };
  });

  return (
    <form onSubmit={onSubmit}>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        {submitError ? (
          <Alert type="error" title={submitError} showIcon />
        ) : null}

        <Card>
          <Form.Item label="Display name" required style={{ maxWidth: 480 }}>
            <Controller
              name="displayName"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    disabled={readOnly}
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

          <Typography.Paragraph type="secondary">
            Role class:{" "}
            <Typography.Text code>
              {role.catalog?.role_class ?? "unknown"}
            </Typography.Text>
            {assignmentCount > 0 ? (
              <>
                {" "}
                · assigned to {assignmentCount} user
                {assignmentCount === 1 ? "" : "s"}
              </>
            ) : null}
          </Typography.Paragraph>
        </Card>

        <Card title="Surface bindings &amp; grants">
          <Typography.Paragraph type="secondary">
            Unchecked grants are default deny — no row is written. Only bound
            surfaces appear in <Typography.Text code>surface_bindings</Typography.Text>.
          </Typography.Paragraph>
          <Collapse items={collapseItems} />
        </Card>

        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={readOnly}
          >
            Save
          </Button>
          <Popconfirm
            title="Delete this role?"
            description={
              assignmentCount > 0
                ? "Role is assigned — revoke assignments first."
                : "This cannot be undone."
            }
            onConfirm={onDelete}
            disabled={readOnly || assignmentCount > 0}
          >
            <Button danger disabled={readOnly || assignmentCount > 0}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      </Space>
    </form>
  );
};
