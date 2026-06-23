"use client";

import { UserAddOutlined } from "@ant-design/icons";
import { fieldAllows, type Manifest } from "@latch/contracts";
import { FieldControl } from "@latch/react";
import { App, Button, Input, Modal, Select, Space, Typography } from "antd";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  type FieldPath,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form";

import { FieldArrayTable } from "@/components/form/FieldArrayTable";
import type { FieldArrayTableColumn } from "@/components/form/FieldArrayTable";
import { FormSection } from "@/components/form/FormSection";
import { findSelectLabel } from "@/components/form/optionHelpers";
import { useSitePartyPicker, sitePartyPickerKey } from "@/lib/hooks/use-site-party-picker";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";
import { createSiteContactPerson } from "@/lib/surface-api";

export type SiteContactFormRow = {
  display_name: string;
  id?: string;
  kind?: string;
  party_id: string;
  relation_id: string;
  relation_label?: string;
  sort_order: number;
};

export type SiteContactsFormValues = {
  contacts: SiteContactFormRow[];
};

type SiteContactFieldsProps = {
  manifest: Manifest;
};

type RelationOption = { value: string; label: string };

const mapRelationOptions = (
  rows: Array<Record<string, unknown>> | undefined,
): RelationOption[] =>
  (rows ?? []).map((row) => {
    const displayName = row.display_name as { display_name?: string } | undefined;
    return {
      value: String(row.id),
      label: displayName?.display_name ?? String(row.id),
    };
  });

const partyOptionsFromRows = (
  rows: Array<{ id: string; display_name: string }> | undefined,
  contacts: SiteContactFormRow[],
): RelationOption[] => {
  const options =
    rows?.map((row) => ({
      value: row.id,
      label: row.display_name,
    })) ?? [];

  for (const contact of contacts) {
    if (
      contact.party_id &&
      contact.display_name &&
      !options.some((option) => option.value === contact.party_id)
    ) {
      options.push({
        value: contact.party_id,
        label: contact.display_name,
      });
    }
  }

  return options.sort((left, right) => left.label.localeCompare(right.label));
};

export const validateSiteContactDuplicates = <T extends FieldValues>(
  contacts: SiteContactFormRow[],
  setError: UseFormSetError<T>,
): boolean => {
  const seen = new Map<string, number>();
  let valid = true;

  contacts.forEach((row, index) => {
    if (!row.party_id || !row.relation_id) {
      return;
    }

    const key = `${row.party_id}:${row.relation_id}`;
    const priorIndex = seen.get(key);
    if (priorIndex !== undefined) {
      const message = "This party already has this relation on the site";
      setError(`contacts.${index}.relation_id` as FieldPath<T>, { message });
      setError(`contacts.${priorIndex}.relation_id` as FieldPath<T>, { message });
      valid = false;
    } else {
      seen.set(key, index);
    }
  });

  return valid;
};

const PartyCell = ({
  index,
  writable,
  disabled,
  options,
  loading,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
  options: RelationOption[];
  loading: boolean;
}) => {
  const { control, setValue, watch } = useFormContext<SiteContactsFormValues>();
  const displayName = watch(`contacts.${index}.display_name`);

  return (
    <Controller<SiteContactsFormValues>
      name={`contacts.${index}.party_id` as FieldPath<SiteContactsFormValues>}
      render={({ field, fieldState }) =>
        writable ? (
          <Select
            showSearch
            optionFilterProp="label"
            options={options}
            value={field.value || undefined}
            onChange={(partyId) => {
              const id = typeof partyId === "string" ? partyId : String(partyId);
              field.onChange(id);
              const label = findSelectLabel(options, id);
              setValue(`contacts.${index}.display_name`, label ?? "", {
                shouldDirty: true,
              });
            }}
            onBlur={field.onBlur}
            disabled={disabled || loading}
            loading={loading}
            status={fieldState.error ? "error" : undefined}
            style={{ width: "100%" }}
            placeholder="Select party"
          />
        ) : (
          <Typography.Text>{displayName || "—"}</Typography.Text>
        )
      }
    />
  );
};

const RelationCell = ({
  index,
  writable,
  disabled,
  options,
  loading,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
  options: RelationOption[];
  loading: boolean;
}) => {
  const { control, watch } = useFormContext<SiteContactsFormValues>();
  const relationLabel = watch(`contacts.${index}.relation_label`);

  return (
    <Controller<SiteContactsFormValues>
      name={`contacts.${index}.relation_id` as FieldPath<SiteContactsFormValues>}
      render={({ field, fieldState }) =>
        writable ? (
          <Select
            showSearch
            optionFilterProp="label"
            options={options}
            value={field.value || undefined}
            onChange={field.onChange}
            onBlur={field.onBlur}
            disabled={disabled || loading}
            loading={loading}
            status={fieldState.error ? "error" : undefined}
            style={{ width: "100%" }}
            placeholder="Select relation"
          />
        ) : (
          <Typography.Text>{relationLabel || "—"}</Typography.Text>
        )
      }
    />
  );
};

type QuickCreatePersonModalProps = {
  open: boolean;
  relationOptions: RelationOption[];
  onClose: () => void;
  onCreated: (row: {
    party_id: string;
    display_name: string;
    relation_id: string;
    kind: string;
  }) => void;
};

const QuickCreatePersonModal = ({
  open,
  relationOptions,
  onClose,
  onCreated,
}: QuickCreatePersonModalProps) => {
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationId, setRelationId] = useState<string | undefined>(
    relationOptions[0]?.value,
  );
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setPhone("");
    setRelationId(relationOptions[0]?.value);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleOk = async () => {
    const displayName = name.trim();
    if (!displayName) {
      message.error("Name is required");
      return;
    }
    if (!relationId) {
      message.error("Relation is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createSiteContactPerson({
        display_name: displayName,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      onCreated({
        party_id: response.data.row.id,
        display_name: response.data.row.display_name,
        relation_id: relationId,
        kind: response.data.row.kind,
      });
      message.success("Person created");
      handleClose();
    } catch {
      message.error("Unable to create person");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Quick-create person"
      open={open}
      onCancel={handleClose}
      onOk={() => {
        void handleOk();
      }}
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Typography.Text type="secondary">Name</Typography.Text>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Pat Superintendent"
            autoFocus
          />
        </div>
        <div>
          <Typography.Text type="secondary">Phone (optional)</Typography.Text>
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="555-0100"
          />
        </div>
        <div>
          <Typography.Text type="secondary">Relation</Typography.Text>
          <Select
            style={{ width: "100%" }}
            options={relationOptions}
            value={relationId}
            onChange={setRelationId}
          />
        </div>
      </Space>
    </Modal>
  );
};

export const SiteContactFields = ({ manifest }: SiteContactFieldsProps) => {
  const queryClient = useQueryClient();
  const { watch } = useFormContext<SiteContactsFormValues>();
  const { append } = useFieldArray({ name: "contacts" });
  const contacts = watch("contacts") ?? [];
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const { data: partyPicker, isLoading: partiesLoading } = useSitePartyPicker("any");
  const { data: relationList, isLoading: relationsLoading } = useSurfaceList(
    "site_contact_relation_table",
  );

  const relationOptions = useMemo(
    () => mapRelationOptions(relationList?.data.rows),
    [relationList?.data.rows],
  );
  const partyOptions = useMemo(
    () => partyOptionsFromRows(partyPicker?.data.rows, contacts),
    [contacts, partyPicker?.data.rows],
  );

  const writable = fieldAllows(manifest, "contacts", "write");
  const catalogEmpty = relationOptions.length === 0;
  const pickerLoading = partiesLoading || relationsLoading;

  const columns = useMemo<
    FieldArrayTableColumn<SiteContactsFormValues, "contacts">[]
  >(
    () => [
      {
        key: "party",
        title: "Party",
        render: ({ index, writable: rowWritable, disabled }) => (
          <PartyCell
            index={index}
            writable={rowWritable}
            disabled={disabled}
            options={partyOptions}
            loading={pickerLoading}
          />
        ),
      },
      {
        key: "relation",
        title: "Relation",
        render: ({ index, writable: rowWritable, disabled }) => (
          <RelationCell
            index={index}
            writable={rowWritable}
            disabled={disabled}
            options={relationOptions}
            loading={pickerLoading}
          />
        ),
      },
    ],
    [partyOptions, pickerLoading, relationOptions],
  );

  const appendContact = (row: Omit<SiteContactFormRow, "sort_order">) => {
    append({
      ...row,
      sort_order: contacts.length + 1,
    });
  };

  const emptyState = catalogEmpty ? (
    <Typography.Paragraph type="secondary">
      Add contact relations before standing contacts can be added.{" "}
      <Link href={routes.contactRelations}>Manage contact relations</Link>
    </Typography.Paragraph>
  ) : contacts.length === 0 ? (
    <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
      No standing contacts
    </Typography.Paragraph>
  ) : null;

  return (
    <FieldControl manifest={manifest} field="contacts">
      <FormSection title="Standing contacts">
        {emptyState}
        <FieldArrayTable<SiteContactsFormValues, "contacts">
          field="contacts"
          name="contacts"
          columns={columns}
          createRow={() => ({
            party_id: "",
            relation_id: "",
            display_name: "",
            sort_order: contacts.length + 1,
          })}
          addLabel="Add contact"
          allowAdd={writable && !catalogEmpty}
          orderable={writable}
        />
        {writable && !catalogEmpty ? (
          <div style={{ marginTop: 12 }}>
            <Button
              icon={<UserAddOutlined />}
              onClick={() => setQuickCreateOpen(true)}
            >
              Quick-create person
            </Button>
          </div>
        ) : null}
        <QuickCreatePersonModal
          open={quickCreateOpen}
          relationOptions={relationOptions}
          onClose={() => setQuickCreateOpen(false)}
          onCreated={(row) => {
            void queryClient.invalidateQueries({
              queryKey: sitePartyPickerKey("any"),
            });
            appendContact({
              party_id: row.party_id,
              display_name: row.display_name,
              relation_id: row.relation_id,
              kind: row.kind,
            });
          }}
        />
      </FormSection>
    </FieldControl>
  );
};
