"use client";

import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  fieldAllows,
  type Manifest,
} from "@latch/contracts";
import { App, Space, Typography } from "antd";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { FormSection } from "@/components/form/FormSection";
import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import { SelectInput } from "@/components/form/SelectInput";
import { TextInput } from "@/components/form/TextInput";
import {
  SiteContactFields,
  validateSiteContactDuplicates,
  type SiteContactFormRow,
} from "@/components/sites/SiteContactFields";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import { useSitePartyPicker } from "@/lib/hooks/use-site-party-picker";
import { routes } from "@/lib/nav-routes";
import { SiteDetailPatchSchema } from "@/lib/sites/descriptors";
import type { SiteHubLinkAccess } from "@/lib/surfaces/prefetch-surface-query";
import { SurfaceApiError } from "@/lib/surface-api";

type SiteDetailFormProps = {
  siteId: string;
  manifest: Manifest;
  hubLinks: SiteHubLinkAccess;
};

type SiteDetailFormValues = {
  profile: {
    name: string;
  };
  customer_party: {
    customer_party_id: string | null;
  };
  property_owner_party: {
    property_owner_party_id: string | null;
  };
  contacts: SiteContactFormRow[];
};

const mapContacts = (rows: unknown): SiteContactFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      id: typeof item.id === "string" ? item.id : undefined,
      party_id: typeof item.party_id === "string" ? item.party_id : "",
      relation_id: typeof item.relation_id === "string" ? item.relation_id : "",
      display_name: typeof item.display_name === "string" ? item.display_name : "",
      relation_label:
        typeof item.relation_label === "string" ? item.relation_label : "",
      kind: typeof item.kind === "string" ? item.kind : undefined,
      sort_order: typeof item.sort_order === "number" ? item.sort_order : index + 1,
    };
  });
};

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
): SiteDetailFormValues => {
  const profile = data?.profile as { name?: string | null } | undefined;
  const customerParty = data?.customer_party as
    | { customer_party_id?: string | null }
    | undefined;
  const propertyOwnerParty = data?.property_owner_party as
    | { property_owner_party_id?: string | null }
    | undefined;

  return {
    profile: {
      name: profile?.name ?? "",
    },
    customer_party: {
      customer_party_id: customerParty?.customer_party_id ?? null,
    },
    property_owner_party: {
      property_owner_party_id: propertyOwnerParty?.property_owner_party_id ?? null,
    },
    contacts: mapContacts(data?.contacts),
  };
};

const partyPickerOptions = (
  rows:
    | Array<{ id: string; display_name: string }>
    | undefined,
): Array<{ value: string; label: string }> =>
  rows?.map((row) => ({
    value: row.id,
    label: row.display_name,
  })) ?? [];

type PortfolioHubLinkProps = {
  partyId: string | null | undefined;
  displayName: string | null | undefined;
  href: string;
  canNavigate: boolean;
};

const PortfolioHubLink = ({
  partyId,
  displayName,
  href,
  canNavigate,
}: PortfolioHubLinkProps) => {
  if (!partyId) {
    return null;
  }

  if (canNavigate) {
    return (
      <Link href={href}>
        {displayName ?? partyId}
      </Link>
    );
  }

  return (
    <Typography.Text type="secondary">
      {displayName ?? partyId}
    </Typography.Text>
  );
};

export const SiteDetailForm = ({
  siteId,
  manifest,
  hubLinks,
}: SiteDetailFormProps) => {
  const isCreate = siteId === "new";
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { data: detail, isLoading, isFetching, error } = useSurfaceDetail(
    "site_detail",
    isCreate ? undefined : siteId,
  );
  const { data: customerPicker } = useSitePartyPicker("customer");
  const { data: propertyOwnerPicker } = useSitePartyPicker("property_owner");
  const patch = useSurfacePatch("site_detail", siteId);
  const create = useSurfaceListCreate("site_list", "site_detail");
  const remove = useSurfaceDelete("site_detail", siteId);

  const activeManifest = detail?.manifest ?? manifest;
  const profile = detail?.data.profile as { name?: string | null } | undefined;
  const customerParty = detail?.data.customer_party as
    | {
        customer_party_id?: string | null;
        customer_display_name?: string | null;
      }
    | undefined;
  const propertyOwnerParty = detail?.data.property_owner_party as
    | {
        property_owner_party_id?: string | null;
        property_owner_display_name?: string | null;
      }
    | undefined;

  const defaultValues = useMemo(
    () => (isCreate ? buildDefaultValues(undefined) : buildDefaultValues(detail?.data)),
    [detail?.data, isCreate],
  );

  const resolver = zodResolver(
    narrowPatchSchema(SiteDetailPatchSchema, activeManifest),
  );

  const form = useForm<SiteDetailFormValues>({
    resolver: resolver as unknown as Resolver<SiteDetailFormValues>,
    defaultValues,
  });

  const customerOptions = useMemo(() => {
    const options = partyPickerOptions(customerPicker?.data.rows);
    const currentId = customerParty?.customer_party_id;
    const currentName = customerParty?.customer_display_name;
    if (
      currentId &&
      currentName &&
      !options.some((option) => option.value === currentId)
    ) {
      return [...options, { value: currentId, label: currentName }];
    }
    return options;
  }, [customerParty?.customer_display_name, customerParty?.customer_party_id, customerPicker?.data.rows]);

  const propertyOwnerOptions = useMemo(() => {
    const options = partyPickerOptions(propertyOwnerPicker?.data.rows);
    const currentId = propertyOwnerParty?.property_owner_party_id;
    const currentName = propertyOwnerParty?.property_owner_display_name;
    if (
      currentId &&
      currentName &&
      !options.some((option) => option.value === currentId)
    ) {
      return [...options, { value: currentId, label: currentName }];
    }
    return options;
  }, [
    propertyOwnerParty?.property_owner_display_name,
    propertyOwnerParty?.property_owner_party_id,
    propertyOwnerPicker?.data.rows,
  ]);

  const canSave = patchableFieldIds(activeManifest).length > 0;
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");
  const saving = patch.isPending || create.isPending;

  const onSave = form.handleSubmit(async (values) => {
    const contacts = values.contacts as SiteContactFormRow[];

    if (
      fieldAllows(activeManifest, "contacts", "write") &&
      !validateSiteContactDuplicates(contacts, form.setError)
    ) {
      message.error("Fix duplicate standing contacts before saving");
      return;
    }

    const body: Record<string, unknown> = {
      profile: values.profile,
      customer_party: values.customer_party,
      property_owner_party: values.property_owner_party,
    };

    if (fieldAllows(activeManifest, "contacts", "write")) {
      body.contacts = contacts.map((row) => ({
        ...(row.id ? { id: row.id } : {}),
        party_id: row.party_id,
        relation_id: row.relation_id,
      }));
    }

    try {
      if (isCreate) {
        const result = await create.mutateAsync(body);
        const newId = String(result.data.id);
        message.success("Site created");
        router.replace(routes.sites.detail(newId));
        router.refresh();
        return;
      }

      await patch.mutateAsync(body);
      message.success("Site saved");
    } catch (error) {
      if (error instanceof SurfaceApiError) {
        const details = error.details as
          | {
              field?: string;
              code?: string;
              party_id?: string;
              relation_id?: string;
            }
          | undefined;

        if (details?.field === "contacts" && details.code === "duplicate") {
          contacts.forEach((row, index) => {
            if (
              row.party_id === details.party_id &&
              row.relation_id === details.relation_id
            ) {
              form.setError(`contacts.${index}.relation_id`, {
                message: "This party already has this relation on the site",
              });
            }
          });
          message.error("Fix duplicate standing contacts before saving");
          return;
        }
      }

      message.error(isCreate ? "Unable to create site" : "Unable to save site");
    }
  });

  const onDelete = () => {
    modal.confirm({
      title: "Delete site?",
      content: "This permanently removes the site.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await remove.mutateAsync();
          message.success("Site deleted");
          router.push(routes.sites.list);
          router.refresh();
        } catch {
          message.error("Unable to delete site");
        }
      },
    });
  };

  const toolbarActions = useMemo(
    () => [
      {
        key: "save",
        label: "Save",
        icon: <SaveOutlined />,
        priority: "primary" as const,
        surfaceAction: "write" as const,
        disabled: !canSave,
        loading: saving,
        onClick: onSave,
      },
      ...(isCreate
        ? []
        : [
            {
              key: "delete",
              label: "Delete",
              icon: <DeleteOutlined />,
              priority: "secondary" as const,
              surfaceAction: "delete" as const,
              danger: true,
              disabled: !canDelete,
              loading: remove.isPending,
              onClick: onDelete,
            },
          ]),
    ],
    [canDelete, canSave, isCreate, onDelete, onSave, remove.isPending, saving],
  );

  useRegisterSurfaceActions(activeManifest, toolbarActions);

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);
  const customerPartyId = form.watch("customer_party.customer_party_id");
  const propertyOwnerPartyId = form.watch("property_owner_party.property_owner_party_id");

  return (
    <SurfaceFormRoot
      manifest={activeManifest}
      loading={initialLoading}
      blocking={blocking}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
      resetKey={isCreate ? "create" : `${siteId}:${detail?.data?.id ?? ""}`}
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout maxWidth={SURFACE_FORM_MAX_WIDTH}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {isCreate ? "New site" : (profile?.name ?? "Site")}
          </Typography.Title>

          <FormSection title="Profile">
            <TextInput<SiteDetailFormValues>
              field="profile"
              name="profile.name"
              label="Name"
            />
          </FormSection>

          <FormSection title="Portfolio">
            <SelectInput<SiteDetailFormValues>
              field="customer_party"
              name="customer_party.customer_party_id"
              label="Customer"
              options={customerOptions}
              selectProps={{ allowClear: true, showSearch: true, optionFilterProp: "label" }}
            />
            {customerPartyId ? (
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Typography.Text type="secondary">Open:</Typography.Text>
                  <PortfolioHubLink
                    partyId={customerPartyId}
                    displayName={customerParty?.customer_display_name}
                    href={routes.customers.detail(customerPartyId)}
                    canNavigate={hubLinks.customer}
                  />
                </Space>
              </div>
            ) : null}

            <SelectInput<SiteDetailFormValues>
              field="property_owner_party"
              name="property_owner_party.property_owner_party_id"
              label="Property owner"
              options={propertyOwnerOptions}
              selectProps={{ allowClear: true, showSearch: true, optionFilterProp: "label" }}
            />
            {propertyOwnerPartyId ? (
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Typography.Text type="secondary">Open:</Typography.Text>
                  <PortfolioHubLink
                    partyId={propertyOwnerPartyId}
                    displayName={propertyOwnerParty?.property_owner_display_name}
                    href={routes.propertyOwners.detail(propertyOwnerPartyId)}
                    canNavigate={hubLinks.propertyOwner}
                  />
                </Space>
              </div>
            ) : null}
          </FormSection>

          <SiteContactFields manifest={activeManifest} />
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
