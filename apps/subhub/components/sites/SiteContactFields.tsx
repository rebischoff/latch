"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { FieldControl } from "@latch/react";
import { Select, Typography } from "antd";
import Link from "next/link";
import { useMemo } from "react";
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
import { useSitePartyPicker } from "@/lib/hooks/use-site-party-picker";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

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

export const SiteContactFields = ({ manifest }: SiteContactFieldsProps) => {
  const { watch } = useFormContext<SiteContactsFormValues>();
  const contacts = watch("contacts") ?? [];

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
    ],
    [partyOptions, pickerLoading, relationOptions],
  );

  const emptyState = catalogEmpty ? (
    <Typography.Paragraph type="secondary">
      Add site relations before contacts can be added.{" "}
      <Link href={routes.contactRelations}>Manage site relations</Link>
    </Typography.Paragraph>
  ) : contacts.length === 0 ? (
    <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
      No contacts
    </Typography.Paragraph>
  ) : null;

  return (
    <FieldControl manifest={manifest} field="contacts">
      <FormSection title="Contacts">
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
      </FormSection>
    </FieldControl>
  );
};
