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

import {
  FieldArrayTable,
  type FieldArrayTableColumn,
} from "@/components/form/FieldArrayTable";
import { FormSection } from "@/components/form/FormSection";
import { findSelectLabel } from "@/components/form/optionHelpers";
import { useSitePartyPicker } from "@/lib/hooks/use-site-party-picker";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

export type EstimateStakeholderFormRow = {
  display_name: string;
  kind?: string;
  party_id: string;
  relation_id: string;
  relation_label?: string;
  sort_order: number;
};

export type EstimateStakeholdersFormValues = {
  stakeholders: EstimateStakeholderFormRow[];
};

type EstimateStakeholderFieldsProps = {
  manifest: Manifest;
};

type SelectOption = { value: string; label: string };

const mapRelationOptions = (
  rows: Array<Record<string, unknown>> | undefined,
): SelectOption[] =>
  (rows ?? []).map((row) => {
    const displayName = row.display_name as { display_name?: string } | undefined;
    return {
      value: String(row.id),
      label: displayName?.display_name ?? String(row.id),
    };
  });

const partyOptionsFromRows = (
  rows: Array<{ id: string; display_name: string }> | undefined,
  stakeholders: EstimateStakeholderFormRow[],
): SelectOption[] => {
  const options =
    rows?.map((row) => ({
      value: row.id,
      label: row.display_name,
    })) ?? [];

  for (const stakeholder of stakeholders) {
    if (
      stakeholder.party_id &&
      stakeholder.display_name &&
      !options.some((option) => option.value === stakeholder.party_id)
    ) {
      options.push({
        value: stakeholder.party_id,
        label: stakeholder.display_name,
      });
    }
  }

  return options.sort((left, right) => left.label.localeCompare(right.label));
};

export const validateEstimateStakeholderDuplicates = <T extends FieldValues>(
  stakeholders: EstimateStakeholderFormRow[],
  setError: UseFormSetError<T>,
): boolean => {
  const seen = new Map<string, number>();
  let valid = true;

  stakeholders.forEach((row, index) => {
    if (!row.party_id || !row.relation_id) {
      return;
    }

    const key = `${row.party_id}:${row.relation_id}`;
    const priorIndex = seen.get(key);
    if (priorIndex !== undefined) {
      const message = "This party already has this relation on the estimate";
      setError(`stakeholders.${index}.relation_id` as FieldPath<T>, { message });
      setError(`stakeholders.${priorIndex}.relation_id` as FieldPath<T>, { message });
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
  options: SelectOption[];
  loading: boolean;
}) => {
  const { setValue, watch } = useFormContext<EstimateStakeholdersFormValues>();
  const displayName = watch(`stakeholders.${index}.display_name`);

  return (
    <Controller<EstimateStakeholdersFormValues>
      name={`stakeholders.${index}.party_id` as FieldPath<EstimateStakeholdersFormValues>}
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
              setValue(`stakeholders.${index}.display_name`, label ?? "", {
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
  options: SelectOption[];
  loading: boolean;
}) => {
  const { watch } = useFormContext<EstimateStakeholdersFormValues>();
  const relationLabel = watch(`stakeholders.${index}.relation_label`);

  return (
    <Controller<EstimateStakeholdersFormValues>
      name={`stakeholders.${index}.relation_id` as FieldPath<EstimateStakeholdersFormValues>}
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

export const EstimateStakeholderFields = ({
  manifest,
}: EstimateStakeholderFieldsProps) => {
  const { watch } = useFormContext<EstimateStakeholdersFormValues>();
  const stakeholders = watch("stakeholders") ?? [];

  const { data: partyPicker, isLoading: partiesLoading } = useSitePartyPicker("any");
  const { data: relationList, isLoading: relationsLoading } = useSurfaceList(
    "job_party_relation_table",
  );

  const relationOptions = useMemo(
    () => mapRelationOptions(relationList?.data.rows),
    [relationList?.data.rows],
  );
  const partyOptions = useMemo(
    () => partyOptionsFromRows(partyPicker?.data.rows, stakeholders),
    [partyPicker?.data.rows, stakeholders],
  );

  const writable = fieldAllows(manifest, "stakeholders", "write");
  const catalogEmpty = relationOptions.length === 0;
  const pickerLoading = partiesLoading || relationsLoading;

  const columns = useMemo<
    FieldArrayTableColumn<EstimateStakeholdersFormValues, "stakeholders">[]
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

  const emptyState = catalogEmpty ? (
    <Typography.Paragraph type="secondary">
      Add party relations before stakeholders can be added.{" "}
      <Link href={routes.partyRelations}>Manage party relations</Link>
    </Typography.Paragraph>
  ) : stakeholders.length === 0 ? (
    <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
      No stakeholders
    </Typography.Paragraph>
  ) : null;

  return (
    <FieldControl manifest={manifest} field="stakeholders">
      <FormSection title="Stakeholders">
        {emptyState}
        <FieldArrayTable<EstimateStakeholdersFormValues, "stakeholders">
          field="stakeholders"
          name="stakeholders"
          columns={columns}
          createRow={() => ({
            party_id: "",
            relation_id: "",
            display_name: "",
            sort_order: stakeholders.length + 1,
          })}
          addLabel="Add stakeholder"
          allowAdd={writable && !catalogEmpty}
          orderable={writable}
        />
      </FormSection>
    </FieldControl>
  );
};
