"use client";

import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { CapabilitiesProvider, FieldControl } from "@latch/react";
import { App, Col, Input, Row, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  Controller,
  useForm,
  type Resolver,
} from "react-hook-form";

import { RhfInput } from "@/components/form/RhfInput";
import { ReadOnlyValue } from "@/components/form/RhfInput";
import { RhfSelect } from "@/components/form/RhfSelect";
import {
  PhoneEmailFields,
  type ContactDetailFormValues,
} from "@/components/contacts/PhoneEmailFields";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import { routes } from "@/lib/nav-routes";
import { SurfaceApiError } from "@/lib/surface-api";
import { ContactDetailPatchSchema } from "@/lib/contacts/descriptors";

type ContactDetailFormProps = {
  contactId: string;
  manifest: Manifest;
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
): ContactDetailFormValues => {
  const profile = data?.profile as
    | {
        kind?: string | null;
        display_name?: string | null;
        legal_name?: string | null;
        notes?: string | null;
      }
    | undefined;

  return {
    profile: {
      kind: profile?.kind ?? "person",
      display_name: profile?.display_name ?? "",
      legal_name: profile?.legal_name ?? "",
      notes: profile?.notes ?? "",
    },
    phones: mapCollectionRows(data?.phones, "number"),
    emails: mapCollectionRows(data?.emails, "address"),
  };
};

export const ContactDetailForm = ({
  contactId,
  manifest,
}: ContactDetailFormProps) => {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { data: detail, isLoading, error } = useSurfaceDetail(
    "contact_detail",
    contactId,
  );
  const patch = useSurfacePatch("contact_detail", contactId);
  const remove = useSurfaceDelete("contact_detail", contactId);

  const activeManifest = detail?.manifest ?? manifest;
  const profile = detail?.data.profile as
    | {
        display_name?: string | null;
        kind?: string | null;
        legal_name?: string | null;
        notes?: string | null;
      }
    | undefined;

  const resolver = zodResolver(
    narrowPatchSchema(ContactDetailPatchSchema, activeManifest),
  );

  const form = useForm<ContactDetailFormValues>({
    resolver: resolver as Resolver<ContactDetailFormValues>,
    defaultValues: buildDefaultValues(undefined),
  });

  useEffect(() => {
    if (detail?.data) {
      form.reset(buildDefaultValues(detail.data));
    }
  }, [detail?.data, form]);

  const profileWritable = fieldAllows(activeManifest, "profile", "write");
  const phonesWritable = fieldAllows(activeManifest, "phones", "write");
  const emailsWritable = fieldAllows(activeManifest, "emails", "write");
  const canSave = patchableFieldIds(activeManifest).length > 0;
  const canDelete = surfaceAllows(activeManifest, "delete");

  const onSave = form.handleSubmit(async (values) => {
    const body: Record<string, unknown> = {};

    if (profileWritable) {
      body.profile = {
        kind: values.profile.kind,
        display_name: values.profile.display_name,
        legal_name: values.profile.legal_name || null,
        notes: values.profile.notes || null,
      };
    }

    if (phonesWritable) {
      body.phones = values.phones.map((phone) => ({
        ...(phone.id ? { id: phone.id } : {}),
        label: phone.label,
        number: phone.number,
        is_primary: phone.is_primary,
      }));
    }

    if (emailsWritable) {
      body.emails = values.emails.map((email) => ({
        ...(email.id ? { id: email.id } : {}),
        label: email.label,
        address: email.address,
        is_primary: email.is_primary,
      }));
    }

    try {
      await patch.mutateAsync(body);
      message.success("Contact saved");
    } catch {
      message.error("Unable to save contact");
    }
  });

  const onDelete = () => {
    modal.confirm({
      title: "Delete contact?",
      content: "This permanently removes the contact.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await remove.mutateAsync();
          message.success("Contact deleted");
          router.push(routes.contacts.list);
          router.refresh();
        } catch {
          message.error("Unable to delete contact");
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
        loading: patch.isPending,
        onClick: onSave,
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
    ],
    [canDelete, canSave, onDelete, onSave, patch.isPending, remove.isPending],
  );

  useRegisterSurfaceActions(activeManifest, toolbarActions);

  if (error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  return (
    <CapabilitiesProvider manifest={activeManifest}>
      {isLoading && !detail ? (
        <Spin />
      ) : (
        <form onSubmit={onSave}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {profile?.display_name ?? "Contact"}
          </Typography.Title>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <FieldControl manifest={activeManifest} field="profile">
                {profileWritable ? (
                  <RhfInput
                    control={form.control}
                    name="profile.display_name"
                    label="Display name"
                  />
                ) : (
                  <ReadOnlyValue
                    label="Display name"
                    value={profile?.display_name}
                  />
                )}
              </FieldControl>
            </Col>
            <Col xs={24} lg={12}>
              <FieldControl manifest={activeManifest} field="profile">
                {profileWritable ? (
                  <RhfSelect
                    control={form.control}
                    name="profile.kind"
                    label="Kind"
                    options={KIND_OPTIONS}
                  />
                ) : (
                  <ReadOnlyValue
                    label="Kind"
                    value={
                      KIND_OPTIONS.find((option) => option.value === profile?.kind)
                        ?.label ?? profile?.kind
                    }
                  />
                )}
              </FieldControl>
            </Col>
            <Col xs={24} lg={12}>
              <FieldControl manifest={activeManifest} field="profile">
                {profileWritable ? (
                  <RhfInput
                    control={form.control}
                    name="profile.legal_name"
                    label="Legal name"
                  />
                ) : (
                  <ReadOnlyValue label="Legal name" value={profile?.legal_name} />
                )}
              </FieldControl>
            </Col>
            <Col xs={24} lg={12}>
              <FieldControl manifest={activeManifest} field="profile">
                {profileWritable ? (
                  <Controller
                    control={form.control}
                    name="profile.notes"
                    render={({ field, fieldState }) => (
                      <div>
                        <Typography.Text type="secondary">Notes</Typography.Text>
                        <Input.TextArea
                          {...field}
                          value={field.value ?? ""}
                          rows={3}
                          status={fieldState.error ? "error" : undefined}
                        />
                        {fieldState.error ? (
                          <Typography.Text type="danger">
                            {fieldState.error.message}
                          </Typography.Text>
                        ) : null}
                      </div>
                    )}
                  />
                ) : (
                  <ReadOnlyValue label="Notes" value={profile?.notes} />
                )}
              </FieldControl>
            </Col>
          </Row>

          <PhoneEmailFields control={form.control} manifest={activeManifest} />
        </form>
      )}
    </CapabilitiesProvider>
  );
};
