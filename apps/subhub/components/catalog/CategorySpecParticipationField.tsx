"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { Checkbox, Typography } from "antd";
import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { FormSection } from "@/components/form/FormSection";

import type { CategoryDetailFormValues } from "./CategoryDetailForm";

type CategorySpecParticipationFieldProps = {
  isRoot: boolean;
  manifest: Manifest;
};

const computeEffectivePreview = (
  participation: CategoryDetailFormValues["spec_participation"],
): CategoryDetailFormValues["spec_participation"]["inherited"] => {
  const inheritedIds = new Set(
    participation.inherited.map((row) => row.spec_def_id),
  );
  for (const row of participation.includes) {
    if (row.active) {
      inheritedIds.add(row.spec_def_id);
    }
  }
  for (const row of participation.excludes) {
    if (row.active) {
      inheritedIds.delete(row.spec_def_id);
    }
  }

  const labels = new Map<string, { display_name: string; value_type: "boolean" | "enum" | "text" }>();
  for (const row of [
    ...participation.inherited,
    ...participation.includes,
    ...participation.excludes,
  ]) {
    labels.set(row.spec_def_id, {
      display_name: row.display_name,
      value_type: row.value_type,
    });
  }

  return [...inheritedIds]
    .map((specDefId) => {
      const label = labels.get(specDefId);
      if (!label) {
        return undefined;
      }
      return {
        spec_def_id: specDefId,
        display_name: label.display_name,
        value_type: label.value_type,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== undefined);
};

export const CategorySpecParticipationField = ({
  isRoot,
  manifest,
}: CategorySpecParticipationFieldProps) => {
  const { control, watch } = useFormContext<CategoryDetailFormValues>();
  const canRead = fieldAllows(manifest, "spec_participation", "read");
  const canWrite = fieldAllows(manifest, "spec_participation", "write");
  const participation = watch("spec_participation");

  const effectivePreview = useMemo(
    () => (isRoot ? [] : computeEffectivePreview(participation)),
    [isRoot, participation],
  );

  if (!canRead) {
    return null;
  }

  const renderChecklist = (
    rows: CategoryDetailFormValues["spec_participation"]["includes"],
    fieldKey: "includes" | "excludes",
    title: string,
  ) => (
    <div>
      <Typography.Text strong>{title}</Typography.Text>
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        {rows.length === 0 ? (
          <Typography.Text type="secondary">No spec definitions on the root category yet.</Typography.Text>
        ) : (
          rows.map((row, index) => (
            <Controller
              key={`${fieldKey}-${row.spec_def_id}`}
              control={control}
              name={`spec_participation.${fieldKey}`}
              render={({ field }) => (
                <Checkbox
                  checked={row.active}
                  disabled={!canWrite}
                  onChange={(event) => {
                    const next = [...field.value];
                    next[index] = {
                      ...row,
                      active: event.target.checked,
                    };
                    field.onChange(next);
                  }}
                >
                  {row.display_name}
                  <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                    ({row.value_type})
                  </Typography.Text>
                </Checkbox>
              )}
            />
          ))
        )}
      </div>
    </div>
  );

  if (isRoot) {
    return (
      <FormSection title="Base includes">
        {renderChecklist(participation.includes, "includes", "Include")}
      </FormSection>
    );
  }

  return (
    <FormSection title="Spec participation">
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <Typography.Text strong>Inherited</Typography.Text>
          <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
            {participation.inherited.length === 0 ? (
              <Typography.Text type="secondary">Nothing inherited from parent.</Typography.Text>
            ) : (
              participation.inherited.map((row) => (
                <Typography.Text key={row.spec_def_id}>
                  {row.display_name}
                  <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                    ({row.value_type})
                  </Typography.Text>
                </Typography.Text>
              ))
            )}
          </div>
        </div>

        {renderChecklist(participation.includes, "includes", "Include")}
        {renderChecklist(participation.excludes, "excludes", "Exclude")}

        <div>
          <Typography.Text strong>Effective</Typography.Text>
          <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
            {effectivePreview.length === 0 ? (
              <Typography.Text type="secondary">No effective participation.</Typography.Text>
            ) : (
              effectivePreview.map((row) => (
                <Typography.Text key={row.spec_def_id}>
                  {row.display_name}
                  <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                    ({row.value_type})
                  </Typography.Text>
                </Typography.Text>
              ))
            )}
          </div>
        </div>
      </div>
    </FormSection>
  );
};
