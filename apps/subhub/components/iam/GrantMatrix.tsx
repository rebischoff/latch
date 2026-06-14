"use client";

import type { FieldAction } from "@latch/contracts";
import type { PolicyRegistry } from "@latch/policy";
import { Checkbox, Select, Table, Typography } from "antd";
import { useMemo } from "react";

import type { RoleGrantTuple, SurfaceBindingTuple } from "@/lib/iam/descriptors";

type GrantMatrixProps = {
  registry: PolicyRegistry;
  grants: RoleGrantTuple[];
  surfaceBindings: SurfaceBindingTuple[];
  readOnly?: boolean;
  onGrantsChange: (grants: RoleGrantTuple[]) => void;
  onBindingsChange: (bindings: SurfaceBindingTuple[]) => void;
};

type MatrixRow = {
  key: string;
  surfaceId: string;
  fieldId: string | null;
  label: string;
  read: boolean;
  write: boolean;
  rowScope: string | null;
};

const hasGrant = (
  grants: RoleGrantTuple[],
  surfaceId: string,
  fieldId: string | null,
  action: FieldAction,
): boolean =>
  grants.some(
    (grant) =>
      grant.surface_id === surfaceId &&
      grant.field_id === fieldId &&
      grant.action === action,
  );

const toggleGrant = (
  grants: RoleGrantTuple[],
  surfaceId: string,
  fieldId: string | null,
  action: FieldAction,
  enabled: boolean,
): RoleGrantTuple[] => {
  const filtered = grants.filter(
    (grant) =>
      !(
        grant.surface_id === surfaceId &&
        grant.field_id === fieldId &&
        grant.action === action
      ),
  );

  if (!enabled) {
    return filtered;
  }

  return [
    ...filtered,
    {
      surface_id: surfaceId,
      field_id: fieldId,
      action,
      mode: null,
    },
  ];
};

const grantableSurfaces = (registry: PolicyRegistry) =>
  Object.values(registry).filter((surface) => surface.kind !== "iam");

export const GrantMatrix = ({
  registry,
  grants,
  surfaceBindings,
  readOnly = false,
  onGrantsChange,
  onBindingsChange,
}: GrantMatrixProps) => {
  const surfaces = useMemo(() => grantableSurfaces(registry), [registry]);

  const rows = useMemo(() => {
    const matrixRows: MatrixRow[] = [];

    for (const surface of surfaces) {
      matrixRows.push({
        key: `${surface.surface}:@:surface`,
        surfaceId: surface.surface,
        fieldId: null,
        label: surface.surface,
        read: hasGrant(grants, surface.surface, null, "read"),
        write: hasGrant(grants, surface.surface, null, "write"),
        rowScope:
          surfaceBindings.find((binding) => binding.surface_id === surface.surface)
            ?.row_scope ?? null,
      });

      for (const fieldId of surface.fieldIds) {
        matrixRows.push({
          key: `${surface.surface}:${fieldId}`,
          surfaceId: surface.surface,
          fieldId,
          label: fieldId,
          read: hasGrant(grants, surface.surface, fieldId, "read"),
          write: hasGrant(grants, surface.surface, fieldId, "write"),
          rowScope: null,
        });
      }
    }

    return matrixRows;
  }, [grants, surfaceBindings, surfaces]);

  if (surfaces.length === 0) {
    return (
      <Typography.Text type="secondary">
        No business surfaces in the policy catalog yet.
      </Typography.Text>
    );
  }

  const updateBinding = (surfaceId: string, rowScope: string | null) => {
    const next = surfaceBindings.filter((binding) => binding.surface_id !== surfaceId);
    if (rowScope !== null) {
      next.push({ surface_id: surfaceId, row_scope: rowScope });
    }
    onBindingsChange(next);
  };

  return (
    <Table
      size="small"
      pagination={false}
      dataSource={rows}
      columns={[
        {
          title: "Surface / field",
          render: (_, row) =>
            row.fieldId === null ? (
              <Typography.Text strong>{row.label}</Typography.Text>
            ) : (
              <Typography.Text style={{ paddingLeft: 16 }}>{row.label}</Typography.Text>
            ),
        },
        {
          title: "Read",
          width: 80,
          render: (_, row) => (
            <Checkbox
              checked={row.read}
              disabled={readOnly}
              onChange={(event) =>
                onGrantsChange(
                  toggleGrant(
                    grants,
                    row.surfaceId,
                    row.fieldId,
                    "read",
                    event.target.checked,
                  ),
                )
              }
            />
          ),
        },
        {
          title: "Write",
          width: 80,
          render: (_, row) => (
            <Checkbox
              checked={row.write}
              disabled={readOnly}
              onChange={(event) =>
                onGrantsChange(
                  toggleGrant(
                    grants,
                    row.surfaceId,
                    row.fieldId,
                    "write",
                    event.target.checked,
                  ),
                )
              }
            />
          ),
        },
        {
          title: "Row scope",
          width: 140,
          render: (_, row) =>
            row.fieldId === null ? (
              <Select
                size="small"
                disabled={readOnly}
                allowClear
                placeholder="—"
                style={{ width: "100%" }}
                value={row.rowScope ?? undefined}
                options={[
                  { value: "all", label: "All" },
                  { value: "own", label: "Own" },
                ]}
                onChange={(value) => updateBinding(row.surfaceId, value ?? null)}
              />
            ) : null,
        },
      ]}
    />
  );
};
