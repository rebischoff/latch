"use client";

import { PlusOutlined } from "@ant-design/icons";
import { surfaceAllows, type Manifest } from "@latch/contracts";
import { App, Button, Dropdown, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useManufacturerRoleActions } from "@/lib/hooks/use-manufacturer-role-actions";
import { routes } from "@/lib/nav-routes";
import {
  PARTY_ROLE_VALUES,
  type PartyRoleValue,
} from "@/lib/contacts/repository/manufacturer-write";
import { SurfaceApiError } from "@/lib/surface-api";

type AlsoRole = {
  role: string;
};

type PartyRoleFieldsProps = {
  partyId: string;
  manifest: Manifest;
  alsoRoles: AlsoRole[];
  currentLensRole: PartyRoleValue;
};

const ROLE_LABELS: Record<PartyRoleValue, string> = {
  customer: "Customer",
  vendor: "Vendor",
  manufacturer: "Manufacturer",
  employee: "Employee",
  property_owner: "Property owner",
  other: "Other",
};

const ROLE_DETAIL_ROUTES: Partial<
  Record<PartyRoleValue, (id: string) => string>
> = {
  customer: routes.customers.detail,
  vendor: routes.vendors.detail,
  manufacturer: routes.manufacturers.detail,
  property_owner: routes.propertyOwners.detail,
};

const roleLabel = (role: string): string =>
  ROLE_LABELS[role as PartyRoleValue] ?? role;

const heldRoles = (
  alsoRoles: AlsoRole[],
  currentLensRole: PartyRoleValue,
): Set<string> =>
  new Set([currentLensRole, ...alsoRoles.map((row) => row.role)]);

export const PartyRoleFields = ({
  partyId,
  manifest,
  alsoRoles,
  currentLensRole,
}: PartyRoleFieldsProps) => {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { addRole, removeRole } = useManufacturerRoleActions(partyId);

  const rolesHeld = useMemo(
    () => heldRoles(alsoRoles, currentLensRole),
    [alsoRoles, currentLensRole],
  );

  const addableRoles = useMemo(
    () =>
      PARTY_ROLE_VALUES.filter(
        (role) => role !== currentLensRole && !rolesHeld.has(role),
      ),
    [currentLensRole, rolesHeld],
  );

  const canAddRole = surfaceAllows(manifest, "add_role") && addableRoles.length > 0;
  const canRemoveLensRole = surfaceAllows(manifest, "remove_role");

  const onAddRole = async (role: PartyRoleValue) => {
    try {
      await addRole.mutateAsync(role);
      message.success(`Added ${roleLabel(role).toLowerCase()} tag`);

      const detailRoute = ROLE_DETAIL_ROUTES[role];
      if (detailRoute) {
        router.push(detailRoute(partyId));
        router.refresh();
        return;
      }

      router.refresh();
    } catch (error) {
      message.error(
        error instanceof SurfaceApiError
          ? error.message
          : `Unable to add ${roleLabel(role).toLowerCase()} tag`,
      );
    }
  };

  const onRemoveLensRole = () => {
    modal.confirm({
      title: `Remove ${roleLabel(currentLensRole).toLowerCase()} tag?`,
      content:
        "The party record is kept. Other role tags remain. You will leave this screen.",
      okText: "Remove tag",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await removeRole.mutateAsync(currentLensRole);
          message.success(`${roleLabel(currentLensRole)} tag removed`);

          const fallbackRole = alsoRoles[0]?.role as PartyRoleValue | undefined;
          const fallbackRoute = fallbackRole
            ? ROLE_DETAIL_ROUTES[fallbackRole]
            : undefined;

          if (fallbackRoute) {
            router.push(fallbackRoute(partyId));
          } else {
            router.push(routes.manufacturers.list);
          }
          router.refresh();
        } catch (error) {
          if (error instanceof SurfaceApiError && error.status === 409) {
            message.error(
              error.message ||
                "Cannot remove manufacturer tag while parts reference this party",
            );
            return;
          }

          message.error(`Unable to remove ${roleLabel(currentLensRole).toLowerCase()} tag`);
        }
      },
    });
  };

  if (alsoRoles.length === 0 && !canAddRole && !canRemoveLensRole) {
    return null;
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {alsoRoles.length > 0 ? (
        <Space wrap align="center" style={{ marginBottom: canAddRole || canRemoveLensRole ? 12 : 0 }}>
          <Typography.Text type="secondary">Also:</Typography.Text>
          {alsoRoles.map((row) => {
            const detailRoute = ROLE_DETAIL_ROUTES[row.role as PartyRoleValue];
            const label = roleLabel(row.role);

            if (detailRoute) {
              return (
                <Link key={row.role} href={detailRoute(partyId)}>
                  <Tag>{label}</Tag>
                </Link>
              );
            }

            return <Tag key={row.role}>{label}</Tag>;
          })}
        </Space>
      ) : null}

      {canAddRole || canRemoveLensRole ? (
        <Space wrap>
          {canAddRole ? (
            <Dropdown
              menu={{
                items: addableRoles.map((role) => ({
                  key: role,
                  label: `Add as ${roleLabel(role).toLowerCase()}`,
                  onClick: () => {
                    void onAddRole(role);
                  },
                })),
              }}
              trigger={["click"]}
            >
              <Button
                icon={<PlusOutlined />}
                loading={addRole.isPending}
                disabled={addRole.isPending || removeRole.isPending}
              >
                Add as…
              </Button>
            </Dropdown>
          ) : null}
          {canRemoveLensRole ? (
            <Button
              danger
              loading={removeRole.isPending}
              disabled={addRole.isPending || removeRole.isPending}
              onClick={onRemoveLensRole}
            >
              Remove {roleLabel(currentLensRole).toLowerCase()} tag
            </Button>
          ) : null}
        </Space>
      ) : null}
    </div>
  );
};
