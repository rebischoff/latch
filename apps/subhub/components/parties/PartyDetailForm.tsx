"use client";

import { UserAddOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { App, Button, Tag, Typography } from "antd";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useMemo, useCallback } from "react";
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
import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import {
  EmployeeDetailCreateSchema,
  EmployeeDetailPatchSchema,
  ManufacturerDetailCreateSchema,
  ManufacturerDetailPatchSchema,
} from "@/lib/contacts/descriptors";
import { useConfirmDirtyNavigate } from "@/lib/hooks/use-confirm-dirty-navigate";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import { routes } from "@/lib/nav-routes";
import {
  navigateAfterCreate,
  navigateOnCancel,
  sanitizeReturnTo,
} from "@/lib/surface-navigation";
import { buildProvisionUserUrl } from "@/lib/provision-user-context";
import { SurfaceApiError } from "@/lib/surface-api";

type PartySurfaceId = "manufacturer_detail" | "employee_detail";

type PartyDetailFormProps = {
  entityId: string;
  surfaceId: PartySurfaceId;
  manifest: Manifest;
  returnTo?: string | null;
  returnField?: string | null;
};

type PartyProfileValues = {
  kind?: string;
  first_name?: string;
  last_name?: string;
  legal_name?: string;
  dba_name?: string | null;
  nick_name?: string | null;
  avatar_url?: string | null;
};

type PartyEmailRow = ContactChildCollectionValues["emails"][number] & {
  is_login_email?: boolean;
};

type PartyDetailFormValues = {
  phones: ContactChildCollectionValues["phones"];
  emails: PartyEmailRow[];
  profile: PartyProfileValues;
};

const KIND_OPTIONS = [
  { value: "person", label: "Person" },
  { value: "organization", label: "Organization" },
];

const isEmployeeSurface = (surfaceId: PartySurfaceId): boolean =>
  surfaceId === "employee_detail";

const mapCollectionRows = <T extends { id?: string; label?: string; is_primary?: boolean }>(
  rows: unknown,
  valueKey: "number" | "address",
  includeLoginEmail = false,
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
      ...(includeLoginEmail
        ? { is_login_email: Boolean(item.is_login_email) }
        : {}),
      [valueKey]: typeof item[valueKey] === "string" ? item[valueKey] : "",
    } as T & Record<typeof valueKey, string>;
  });
};

const buildDefaultValues = (
  surfaceId: PartySurfaceId,
  data: Record<string, unknown> | undefined,
  isCreate: boolean,
): PartyDetailFormValues => {
  const employee = isEmployeeSurface(surfaceId);

  if (isCreate) {
    return {
      profile: employee
        ? {
            first_name: "",
            last_name: "",
            nick_name: "",
            avatar_url: "",
          }
        : {
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

  const profile = data?.profile as PartyProfileValues | undefined;

  return {
    profile: employee
      ? {
          first_name: profile?.first_name ?? "",
          last_name: profile?.last_name ?? "",
          nick_name: profile?.nick_name ?? "",
          avatar_url: profile?.avatar_url ?? "",
        }
      : {
          kind: profile?.kind ?? "person",
          first_name: profile?.first_name ?? "",
          last_name: profile?.last_name ?? "",
          legal_name: profile?.legal_name ?? "",
          dba_name: profile?.dba_name ?? "",
        },
    phones: mapCollectionRows(data?.phones, "number"),
    emails: mapCollectionRows(data?.emails, "address", employee),
  };
};

const normalizePhonesBody = (rows: PartyDetailFormValues["phones"]) =>
  rows.map((phone) => ({
    ...(phone.id ? { id: phone.id } : {}),
    label: phone.label,
    number: phone.number,
    is_primary: phone.is_primary,
  }));

const normalizeEmailsBody = (
  rows: PartyDetailFormValues["emails"],
  includeLoginEmail: boolean,
) =>
  rows.map((email) => ({
    ...(email.id ? { id: email.id } : {}),
    label: email.label,
    address: email.address,
    is_primary: email.is_primary,
    ...(includeLoginEmail ? { is_login_email: Boolean(email.is_login_email) } : {}),
  }));

const buildManufacturerProfileBody = (
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

const buildEmployeeProfileBody = (profile: PartyProfileValues): Record<string, unknown> => ({
  first_name: profile.first_name,
  last_name: profile.last_name,
  nick_name: profile.nick_name === "" ? null : profile.nick_name,
  avatar_url: profile.avatar_url === "" ? null : profile.avatar_url,
});

const resolveSchema = (
  surfaceId: PartySurfaceId,
  isCreate: boolean,
  manifest: Manifest,
) => {
  const baseSchema = (
    surfaceId === "employee_detail"
      ? isCreate
        ? EmployeeDetailCreateSchema
        : EmployeeDetailPatchSchema
      : isCreate
        ? ManufacturerDetailCreateSchema
        : ManufacturerDetailPatchSchema
  ) as z.ZodObject<z.ZodRawShape>;

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
  returnTo = null,
  returnField = null,
}: PartyDetailFormProps) => {
  const isCreate = entityId === "new";
  const employee = isEmployeeSurface(surfaceId);
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { data: detail, isLoading, isFetching, error } = useSurfaceDetail(
    surfaceId,
    isCreate ? undefined : entityId,
  );
  const patch = useSurfacePatch(surfaceId, entityId);
  const create = useSurfaceListCreate(
    employee ? "employee_list" : "manufacturer_list",
    surfaceId,
  );
  const remove = useSurfaceDelete(surfaceId, entityId);

  const activeManifest = detail?.manifest ?? manifest;
  const profile = detail?.data.profile as
    | {
        display_name?: string | null;
        kind?: string | null;
        latch_user_id?: string | null;
        also_roles?: Array<{ role: string }>;
      }
    | undefined;
  const staff = detail?.data.staff as { is_staff?: boolean } | undefined;

  const defaultValues = useMemo(
    () =>
      isCreate
        ? buildDefaultValues(surfaceId, undefined, true)
        : buildDefaultValues(surfaceId, detail?.data, false),
    [detail?.data, isCreate, surfaceId],
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
  const isPerson = employee || kind === "person";
  const latchUserId = profile?.latch_user_id ?? null;

  const canSave = patchableFieldIds(activeManifest).length > 0;
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");
  const canAddAsDbUser =
    !isCreate &&
    employee &&
    !latchUserId &&
    surfaceAllows(activeManifest, "add_as_db_user");
  const saving = patch.isPending || create.isPending;

  const profileWritable = fieldAllows(activeManifest, "profile", "write");
  const phonesWritable = fieldAllows(activeManifest, "phones", "write");
  const emailsWritable = fieldAllows(activeManifest, "emails", "write");
  const showLoginEmail =
    employee && (Boolean(latchUserId) || emailsWritable);

  const listRoute = employee ? routes.employees.list : routes.manufacturers.list;
  const detailRoute = employee ? routes.employees.detail : routes.manufacturers.detail;
  const entityLabel = employee ? "employee" : "manufacturer";
  const entityLabelTitle = employee ? "Employee" : "Manufacturer";

  const persistParty = useCallback(
    async (values: PartyDetailFormValues, afterCreate: "detail" | "reset") => {
      const body: Record<string, unknown> = {};

      if (profileWritable) {
        body.profile = employee
          ? buildEmployeeProfileBody(values.profile)
          : buildManufacturerProfileBody(values.profile, isCreate);
      }

      if (phonesWritable) {
        body.phones = normalizePhonesBody(values.phones);
      }

      if (emailsWritable) {
        body.emails = normalizeEmailsBody(values.emails, showLoginEmail);
      }

      try {
        if (isCreate) {
          const result = await create.mutateAsync(body);
          const newId = String(result.data.id);
          message.success(`${entityLabelTitle} created`);

          if (afterCreate === "reset") {
            form.reset(buildDefaultValues(surfaceId, undefined, true));
            return;
          }

          if (returnField && returnTo) {
            navigateAfterCreate(router, {
              returnTo: sanitizeReturnTo(returnTo, listRoute),
              returnField,
              newId,
              fallbackList: listRoute,
              fallbackDetail: detailRoute,
            });
            return;
          }

          router.replace(detailRoute(newId));
          router.refresh();
          return;
        }

        await patch.mutateAsync(body);
        message.success(`${entityLabelTitle} saved`);
      } catch (saveError) {
        message.error(
          saveError instanceof SurfaceApiError
            ? saveError.message
            : isCreate
              ? `Unable to create ${entityLabel}`
              : `Unable to save ${entityLabel}`,
        );
      }
    },
    [
      create,
      detailRoute,
      emailsWritable,
      employee,
      entityLabel,
      entityLabelTitle,
      form,
      isCreate,
      listRoute,
      message,
      patch,
      phonesWritable,
      profileWritable,
      returnField,
      returnTo,
      router,
      showLoginEmail,
      surfaceId,
    ],
  );

  const onSave = form.handleSubmit((values) => persistParty(values, "detail"));

  const onSaveAndNew = useMemo(
    () =>
      isCreate && !returnField
        ? form.handleSubmit((values) => persistParty(values, "reset"))
        : undefined,
    [form, isCreate, persistParty, returnField],
  );

  const onCancel = useCallback(() => {
    const navigate = () => {
      navigateOnCancel(router, returnTo, listRoute);
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
  }, [isDirty, listRoute, modal, returnTo, router]);

  const onRevert = useCallback(() => {
    form.reset(defaultValues);
    message.info("Reverted to last loaded values");
  }, [defaultValues, form, message]);

  const onDelete = useCallback(() => {
    modal.confirm({
      title: `Delete ${entityLabel}?`,
      content: employee
        ? "This permanently removes the employee and their party record."
        : "This permanently removes the manufacturer party.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await remove.mutateAsync();
          message.success(`${entityLabelTitle} deleted`);
          router.push(listRoute);
          router.refresh();
        } catch (deleteError) {
          if (deleteError instanceof SurfaceApiError && deleteError.status === 409) {
            message.error(
              deleteError.message ||
                `${entityLabelTitle} is referenced elsewhere and cannot be deleted`,
            );
            return;
          }

          message.error(`Unable to delete ${entityLabel}`);
        }
      },
    });
  }, [employee, entityLabel, entityLabelTitle, listRoute, message, modal, remove, router]);

  useSurfaceFormChrome({
    mode: isCreate ? "create" : "edit",
    manifest: activeManifest,
    canSave,
    saving,
    onSave,
    isDirty,
    canDelete,
    onDelete: isCreate ? undefined : onDelete,
    onRevert: isCreate ? undefined : onRevert,
    onCancel: isCreate ? onCancel : undefined,
    onSaveAndNew,
  });

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);
  const title = isCreate
    ? `New ${entityLabel}`
    : ((profile?.display_name as string | undefined) ?? entityLabelTitle);
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

          {employee && latchUserId ? (
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <Link href={routes.users.detail(latchUserId)}>App user</Link>
            </Typography.Paragraph>
          ) : null}

          {canAddAsDbUser ? (
            <EmployeeAddUserLink
              partyId={entityId}
              returnTo={routes.employees.detail(entityId)}
            />
          ) : null}

          {!isCreate && !employee ? (
            <PartyRoleFields
              partyId={entityId}
              manifest={activeManifest}
              alsoRoles={alsoRoles}
              currentLensRole="manufacturer"
            />
          ) : null}

          {employee && staff?.is_staff ? (
            <div style={{ marginBottom: 16 }}>
              <Tag color="green">Staff</Tag>
            </div>
          ) : null}

          {fieldAllows(activeManifest, "profile", "read") ? (
            <FormSection title="Profile">
              {!employee && isCreate && profileWritable ? (
                <SelectInput<PartyDetailFormValues>
                  field="profile"
                  name="profile.kind"
                  label="Kind"
                  options={KIND_OPTIONS}
                />
              ) : !employee ? (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  Kind:{" "}
                  {KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind}
                </Typography.Paragraph>
              ) : null}

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
                  {employee ? (
                    <>
                      <TextInput<PartyDetailFormValues>
                        field="profile"
                        name="profile.nick_name"
                        label="Nick name"
                      />
                      <TextInput<PartyDetailFormValues>
                        field="profile"
                        name="profile.avatar_url"
                        label="Avatar URL"
                      />
                    </>
                  ) : null}
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
            showLoginEmail={showLoginEmail}
          />
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};

const EmployeeAddUserLink = ({
  partyId,
  returnTo,
}: {
  partyId: string;
  returnTo: string;
}) => {
  const confirmNavigate = useConfirmDirtyNavigate();
  const href = buildProvisionUserUrl({ partyId, returnTo });

  return (
    <Typography.Paragraph style={{ marginBottom: 0 }}>
      <Button
        type="link"
        icon={<UserAddOutlined />}
        style={{ padding: 0, height: "auto" }}
        onClick={() => confirmNavigate(href)}
      >
        Add User
      </Button>
    </Typography.Paragraph>
  );
};
