"use client";

import {
  CloseOutlined,
  DeleteOutlined,
  SaveOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
  type SurfaceId,
} from "@latch/contracts";
import { App, Typography } from "antd";
import { notFound, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm, type Control, type Resolver } from "react-hook-form";
import { z } from "zod";

import {
  PhoneEmailFields,
  type ContactChildCollectionValues,
  type ContactDetailFormValues,
} from "@/components/contacts/PhoneEmailFields";
import { FormSection } from "@/components/form/FormSection";
import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import { SelectInput } from "@/components/form/SelectInput";
import { TextInput } from "@/components/form/TextInput";
import { PartyRoleFields } from "@/components/parties/PartyRoleFields";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import {
  ManufacturerDetailCreateSchema,
  ManufacturerDetailPatchSchema,
} from "@/lib/contacts/descriptors";
import { useSurfaceCreate } from "@/lib/hooks/use-surface-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import { routes } from "@/lib/nav-routes";
import { redirectAfterCreate, redirectOnCancel } from "@/lib/picker-return-context";
import { SurfaceApiError } from "@/lib/surface-api";

type PartyDetailFormProps = {
  entityId: string;
  surfaceId: "manufacturer_detail";
  manifest: Manifest;
  isCreate?: boolean;
  returnTo?: string | null;
  returnField?: string | null;
};

type PartyProfileValues = {
  kind: string;
  first_name?: string;
  last_name?: string;
  legal_name?: string;
  dba_name?: string | null;
};

type PartyDetailFormValues = ContactChildCollectionValues & {
  profile: PartyProfileValues;
};

const KIND_OPTIONS = [
  { value: "person", label: "Person" },
  { value: "organization", label: "Organization" },
];

const mapCollectionRows = <T extends { id?: string; label?: string; is_primary?: boolean }>(
  rows: unknown,
  valueKey: "number" | "address",
): Array<T & Record<typeof valueKey, string>> => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: typeof item.id === "string" ? item.id : undefined,
      label: typeof item.label === "string" ? item.label : "",
      is_primary: Boolean(item.is_primary),
      [valueKey]: typeof item[valueKey] === "string" ? item[valueKey] : "",
    } as T & Record<typeof valueKey, string>;
  });
};

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
  isCreate: boolean,
): PartyDetailFormValues => {
  if (isCreate) {
    return {
      profile: {
        kind: "organization",
        first_name: "",
        last_name: "",
        legal_name: "",
        dba_name: "",
      },
      phones: [],
      emails: [],
    };
  }

  const profile = data?.profile as
    | {
        kind?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        legal_name?: string | null;
        dba_name?: string | null;
      }
    | undefined;

  return {
    profile: {
      kind: profile?.kind ?? "person",
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      legal_name: profile?.legal_name ?? "",
      dba_name: profile?.dba_name ?? "",
    },
    phones: mapCollectionRows(data?.phones, "number"),
    emails: mapCollectionRows(data?.emails, "address"),
  };
};

const normalizePhonesBody = (rows: PartyDetailFormValues["phones"]) =>
  rows.map((phone) => ({
    ...(phone.id ? { id: phone.id } : {}),
    label: phone.label,
    number: phone.number,
    is_primary: phone.is_primary,
  }));

const normalizeEmailsBody = (rows: PartyDetailFormValues["emails"]) =>
  rows.map((email) => ({
    ...(email.id ? { id: email.id } : {}),
    label: email.label,
    address: email.address,
    is_primary: email.is_primary,
  }));

const buildProfileBody = (
  profile: PartyProfileValues,
  isCreate: boolean,
): Record<string, unknown> => {
  if (profile.kind === "person") {
    return isCreate
      ? {
          kind: profile.kind,
          first_name: profile.first_name,
          last_name: profile.last_name,
        }
      : {
          first_name: profile.first_name,
          last_name: profile.last_name,
        };
  }

  return isCreate
    ? {
        kind: profile.kind,
        legal_name: profile.legal_name,
        dba_name: profile.dba_name === "" ? null : profile.dba_name,
      }
    : {
        legal_name: profile.legal_name,
        dba_name: profile.dba_name === "" ? null : profile.dba_name,
      };
};

const resolveSchema = (surfaceId: SurfaceId, isCreate: boolean, manifest: Manifest) => {
  if (surfaceId !== "manufacturer_detail") {
    throw new Error(`Unsupported surface: ${surfaceId}`);
  }

  const baseSchema = (isCreate ? ManufacturerDetailCreateSchema : ManufacturerDetailPatchSchema) as z.ZodObject<
    z.ZodRawShape
  >;
  const narrowed = narrowPatchSchema(baseSchema, manifest) as z.ZodObject<z.ZodRawShape>;

  return narrowed.extend({
    phones: z.array(z.object({}).passthrough()).optional(),
    emails: z.array(z.object({}).passthrough()).optional(),
  });
};

export const PartyDetailForm = ({
  entityId,
  surfaceId,
  manifest,
  isCreate = false,
  returnTo = null,
}: PartyDetailFormProps) => {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { data: detail, isLoading, isFetching, error } = useSurfaceDetail(
    surfaceId,
    isCreate ? undefined : entityId,
  );
  const patch = useSurfacePatch(surfaceId, entityId);
  const create = useSurfaceCreate(surfaceId, entityId);
  const remove = useSurfaceDelete(surfaceId, entityId);

  const activeManifest = detail?.manifest ?? manifest;
  const profile = detail?.data.profile as
    | {
        display_name?: string | null;
        kind?: string | null;
        also_roles?: Array<{ role: string }>;
      }
    | undefined;

  const defaultValues = useMemo(
    () =>
      isCreate
        ? buildDefaultValues(undefined, true)
        : buildDefaultValues(detail?.data, false),
    [detail?.data, isCreate],
  );

  const resolver = useMemo(() => {
    const schema = resolveSchema(surfaceId, isCreate, activeManifest);
    return zodResolver(schema) as unknown as Resolver<PartyDetailFormValues>;
  }, [activeManifest, isCreate, surfaceId]);

  const form = useForm<PartyDetailFormValues>({
    resolver,
    defaultValues,
  });

  const {
    formState: { isDirty },
    watch,
  } = form;

  const kind = watch("profile.kind") ?? profile?.kind ?? "person";
  const isPerson = kind === "person";

  const canSave = patchableFieldIds(activeManifest).length > 0;
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");
  const saving = patch.isPending || create.isPending;
  const profileWritable = fieldAllows(activeManifest, "profile", "write");
  const phonesWritable = fieldAllows(activeManifest, "phones", "write");
  const emailsWritable = fieldAllows(activeManifest, "emails", "write");

  const onSave = form.handleSubmit(async (values) => {
    const body: Record<string, unknown> = {};

    if (profileWritable) {
      body.profile = buildProfileBody(values.profile, isCreate);
    }

    if (phonesWritable) {
      body.phones = normalizePhonesBody(values.phones);
    }

    if (emailsWritable) {
      body.emails = normalizeEmailsBody(values.emails);
    }

    try {
      if (isCreate) {
        await create.mutateAsync(body);
        message.success("Manufacturer created");

        if (returnTo) {
          router.replace(redirectAfterCreate(returnTo, entityId));
          router.refresh();
          return;
        }

        router.replace(routes.manufacturers.detail(entityId));
        router.refresh();
        return;
      }

      await patch.mutateAsync(body);
      message.success("Manufacturer saved");
    } catch (saveError) {
      message.error(
        saveError instanceof SurfaceApiError
          ? saveError.message
          : isCreate
            ? "Unable to create manufacturer"
            : "Unable to save manufacturer",
      );
    }
  });

  const onCancel = () => {
    if (returnTo) {
      router.push(redirectOnCancel(returnTo));
      return;
    }

    router.push(routes.manufacturers.list);
  };

  const onRevert = () => {
    form.reset(defaultValues);
    message.info("Reverted to last loaded values");
  };

  const onDelete = () => {
    modal.confirm({
      title: "Delete manufacturer?",
      content: "This permanently removes the manufacturer party.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await remove.mutateAsync();
          message.success("Manufacturer deleted");
          router.push(routes.manufacturers.list);
          router.refresh();
        } catch (deleteError) {
          if (deleteError instanceof SurfaceApiError && deleteError.status === 409) {
            message.error(
              deleteError.message ||
                "Manufacturer is referenced by parts and cannot be deleted",
            );
            return;
          }

          message.error("Unable to delete manufacturer");
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
        disabled: !canSave || (!isCreate && !isDirty),
        loading: saving,
        onClick: onSave,
      },
      ...(isCreate
        ? [
            {
              key: "cancel",
              label: "Cancel",
              icon: <CloseOutlined />,
              priority: "secondary" as const,
              surfaceAction: "write" as const,
              disabled: saving,
              onClick: onCancel,
            },
          ]
        : [
            {
              key: "revert",
              label: "Revert",
              icon: <UndoOutlined />,
              priority: "secondary" as const,
              surfaceAction: "write" as const,
              disabled: !isDirty || saving,
              onClick: onRevert,
            },
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
    [
      canDelete,
      canSave,
      isCreate,
      isDirty,
      onCancel,
      onDelete,
      onRevert,
      onSave,
      remove.isPending,
      saving,
    ],
  );

  useRegisterSurfaceActions(activeManifest, toolbarActions);

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);
  const title = isCreate
    ? "New manufacturer"
    : (profile?.display_name ?? "Manufacturer");
  const alsoRoles = profile?.also_roles ?? [];

  return (
    <SurfaceFormRoot
      manifest={activeManifest}
      loading={initialLoading}
      blocking={blocking}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
      resetKey={isCreate ? "create" : `${entityId}:${detail?.data?.id ?? ""}`}
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout maxWidth={SURFACE_FORM_MAX_WIDTH}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {title}
          </Typography.Title>

          {!isCreate ? (
            <PartyRoleFields
              partyId={entityId}
              manifest={activeManifest}
              alsoRoles={alsoRoles}
              currentLensRole="manufacturer"
            />
          ) : null}

          {fieldAllows(activeManifest, "profile", "read") ? (
            <FormSection title="Profile">
              {isCreate && profileWritable ? (
                <SelectInput<PartyDetailFormValues>
                  field="profile"
                  name="profile.kind"
                  label="Kind"
                  options={KIND_OPTIONS}
                />
              ) : (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  Kind:{" "}
                  {KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind}
                </Typography.Paragraph>
              )}

              {isPerson ? (
                <>
                  <TextInput<PartyDetailFormValues>
                    field="profile"
                    name="profile.first_name"
                    label="First name"
                  />
                  <TextInput<PartyDetailFormValues>
                    field="profile"
                    name="profile.last_name"
                    label="Last name"
                  />
                </>
              ) : (
                <>
                  <TextInput<PartyDetailFormValues>
                    field="profile"
                    name="profile.legal_name"
                    label="Legal name"
                  />
                  <TextInput<PartyDetailFormValues>
                    field="profile"
                    name="profile.dba_name"
                    label="DBA name"
                  />
                </>
              )}
            </FormSection>
          ) : null}

          <PhoneEmailFields
            control={form.control as unknown as Control<ContactDetailFormValues>}
            manifest={activeManifest}
          />
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
