"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  fieldAllows,
  type Manifest,
} from "@latch/contracts";
import { App } from "antd";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import { SelectInput } from "@/components/form/SelectInput";
import { TextInput } from "@/components/form/TextInput";
import {
  SiteContactFields,
  validateSiteContactDuplicates,
  type SiteContactFormRow,
} from "@/components/sites/SiteContactFields";
import { SiteScopesZonesTree } from "@/components/sites/SiteScopesZonesTree";
import {
  stripScopesForPatch,
  type SiteScopeFormRow,
  type SiteScopesFormValues,
  type SiteZoneFormRow,
} from "@/components/sites/site-scopes-tree";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { DetailHeader } from "@/components/surface/DetailHeader";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import { useSitePartyPicker } from "@/lib/hooks/use-site-party-picker";
import { routes } from "@/lib/nav-routes";
import {
  navigateAfterCreate,
  navigateOnCancel,
  sanitizeReturnTo,
} from "@/lib/surface-navigation";
import { SiteDetailCreateSchema, SiteDetailPatchSchema } from "@/lib/sites/descriptors";
import { SurfaceApiError } from "@/lib/surface-api";

type SiteDetailFormProps = {
  siteId: string;
  manifest: Manifest;
  returnTo?: string | null;
  returnField?: string | null;
};

type SiteDetailFormValues = SiteScopesFormValues & {
  profile: {
    name: string;
  };
  customer_party: {
    customer_party_id: string | null;
  };
  contacts: SiteContactFormRow[];
};

const mapZones = (rows: unknown): SiteZoneFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const mapNested = (items: unknown[]): SiteZoneFormRow[] =>
    items.map((row, index) => {
      const item = row as Record<string, unknown>;
      return {
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        name: typeof item.name === "string" ? item.name : "",
        sort_order: typeof item.sort_order === "number" ? item.sort_order : index + 1,
        status: typeof item.status === "string" ? item.status : "active",
        can_delete: item.can_delete !== false,
        zones: Array.isArray(item.zones) ? mapNested(item.zones) : [],
      };
    });

  return mapNested(rows);
};

const mapScopes = (rows: unknown): SiteScopeFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      root_item_id: typeof item.root_item_id === "string" ? item.root_item_id : "",
      root_item_name:
        typeof item.root_item_name === "string" ? item.root_item_name : "",
      name: typeof item.name === "string" ? item.name : "",
      sort_order: typeof item.sort_order === "number" ? item.sort_order : index + 1,
      status: typeof item.status === "string" ? item.status : "active",
      can_delete: item.can_delete !== false,
      zones: mapZones(item.zones),
    };
  });
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

  return {
    profile: {
      name: profile?.name ?? "",
    },
    customer_party: {
      customer_party_id: customerParty?.customer_party_id ?? null,
    },
    contacts: mapContacts(data?.contacts),
    scopes: mapScopes(data?.scopes),
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

export const SiteDetailForm = ({
  siteId,
  manifest,
  returnTo = null,
  returnField = null,
}: SiteDetailFormProps) => {
  const isCreate = siteId === "new";
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { data: detail, isLoading, isFetching, error } = useSurfaceDetail(
    "site_detail",
    isCreate ? undefined : siteId,
  );
  const { data: customerPicker } = useSitePartyPicker("customer");
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

  const defaultValues = useMemo(
    () => (isCreate ? buildDefaultValues(undefined) : buildDefaultValues(detail?.data)),
    [detail?.data, isCreate],
  );

  const resolver = useMemo(() => {
    const baseSchema = (isCreate
      ? SiteDetailCreateSchema
      : SiteDetailPatchSchema) as z.ZodObject<z.ZodRawShape>;

    // Server enforces strict collection schemas; form rows carry display-only keys.
    const narrowed = narrowPatchSchema(baseSchema, activeManifest) as z.ZodObject<z.ZodRawShape>;
    const loosened = narrowed.extend({
      contacts: z.array(z.object({}).passthrough()).optional(),
      scopes: z.array(z.object({}).passthrough()).optional(),
    });

    return zodResolver(loosened);
  }, [activeManifest, isCreate]);

  const form = useForm<SiteDetailFormValues>({
    resolver: resolver as unknown as Resolver<SiteDetailFormValues>,
    defaultValues,
  });

  const {
    formState: { isDirty },
  } = form;

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

  const canSave = patchableFieldIds(activeManifest).length > 0;
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");
  const saving = patch.isPending || create.isPending;

  const persistSite = useCallback(
    async (values: SiteDetailFormValues, afterCreate: "detail" | "reset") => {
      const contacts = values.contacts as SiteContactFormRow[];

      if (
        fieldAllows(activeManifest, "contacts", "write") &&
        !validateSiteContactDuplicates(contacts, form.setError)
      ) {
        message.error("Fix duplicate contacts before saving");
        return;
      }

      const body: Record<string, unknown> = {
        profile: values.profile,
        customer_party: values.customer_party,
      };

      if (fieldAllows(activeManifest, "contacts", "write")) {
        body.contacts = contacts.map((row) => ({
          ...(row.id ? { id: row.id } : {}),
          party_id: row.party_id,
          relation_id: row.relation_id,
        }));
      }

      if (!isCreate && fieldAllows(activeManifest, "scopes", "write")) {
        const scopesPatch = stripScopesForPatch({
          scopes: values.scopes,
        });
        body.scopes = scopesPatch.scopes;
      }

      try {
        if (isCreate) {
          const result = await create.mutateAsync(body);
          const newId = String(result.data.id);
          message.success("Site created");

          if (afterCreate === "reset") {
            form.reset(buildDefaultValues(undefined));
            return;
          }

          if (returnField && returnTo) {
            navigateAfterCreate(router, {
              returnTo: sanitizeReturnTo(returnTo, routes.sites.list),
              returnField,
              newId,
              fallbackList: routes.sites.list,
              fallbackDetail: routes.sites.detail,
            });
            return;
          }

          router.replace(routes.sites.detail(newId));
          router.refresh();
          return;
        }

        await patch.mutateAsync(body);
        message.success("Site saved");
      } catch (saveError) {
        if (saveError instanceof SurfaceApiError) {
          const details = saveError.details as
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
            message.error("Fix duplicate contacts before saving");
            return;
          }

          if (
            details?.field === "scopes" &&
            details.code === "referenced"
          ) {
            message.error(
              "Cannot delete scopes or zones referenced by estimates, jobs, or assets",
            );
            return;
          }
        }

        message.error(isCreate ? "Unable to create site" : "Unable to save site");
      }
    },
    [
      activeManifest,
      create,
      form,
      isCreate,
      message,
      patch,
      returnField,
      returnTo,
      router,
    ],
  );

  const onSave = form.handleSubmit((values) => persistSite(values, "detail"));

  const onSaveAndNew = useMemo(
    () =>
      isCreate && !returnField
        ? form.handleSubmit((values) => persistSite(values, "reset"))
        : undefined,
    [form, isCreate, persistSite, returnField],
  );

  const onCancel = useCallback(() => {
    const navigate = () => {
      navigateOnCancel(router, returnTo, routes.sites.list);
    };

    if (isDirty) {
      modal.confirm({
        title: "Leave without saving?",
        content: "Unsaved changes will be lost.",
        okText: "Leave",
        onOk: navigate,
      });
      return;
    }

    navigate();
  }, [isDirty, modal, returnTo, router]);

  const onDelete = useCallback(() => {
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
  }, [message, modal, remove, router]);

  useSurfaceFormChrome({
    mode: isCreate ? "create" : "edit",
    manifest: activeManifest,
    canSave,
    saving,
    onSave,
    isDirty,
    canDelete,
    onDelete,
    onCancel: isCreate ? onCancel : undefined,
    onSaveAndNew,
  });

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);

  const generalTab = (
    <>
      <TextInput<SiteDetailFormValues>
        field="profile"
        name="profile.name"
        label="Name"
      />
      <SelectInput<SiteDetailFormValues>
        field="customer_party"
        name="customer_party.customer_party_id"
        label="Customer"
        options={customerOptions}
        selectProps={{ allowClear: true, showSearch: true, optionFilterProp: "label" }}
      />
      <SiteContactFields manifest={activeManifest} />
    </>
  );

  const canReadScopes =
    fieldAllows(activeManifest, "scopes", "read") ||
    fieldAllows(activeManifest, "scopes", "write");

  const tabItems = [
    { key: "general", label: "General", children: generalTab },
    ...(!isCreate && canReadScopes
      ? [
          {
            key: "scopes-zones",
            label: "Scopes & zones",
            children: <SiteScopesZonesTree manifest={activeManifest} />,
          },
        ]
      : []),
  ];

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
          <DetailHeader
            title={isCreate ? "New site" : (profile?.name ?? "Site")}
            items={tabItems.length > 0 ? tabItems : undefined}
          />
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
