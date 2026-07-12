"use client";

import { useCallback, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

import type {
  EstimateConditionFormRow,
  EstimateLineEditorFormValues,
  EstimateLineFormRow,
} from "@/components/estimates/estimate-line-tree";
import { findConditionPath } from "@/components/estimates/estimate-line-selection";
import {
  fetchEstimateLinePreview,
  type EstimateLinePreviewConditionDraft,
  type EstimateLinePreviewResultLine,
} from "@/lib/surface-api";

const PREVIEW_FIELDS = [
  "part_id",
  "vendor_part_id",
  "unit_material",
  "unit_freight",
  "unit_incidental",
  "unit_labor",
  "unit_cost",
  "unit_price_target",
  "unit_price",
] as const;

const toPreviewLine = (line: EstimateLineFormRow) => ({
  id: line.id,
  item_id: line.item_id,
  part_id: line.part_id,
  sales_locked: line.sales_locked,
  material_locked: line.material_locked,
  quantity: line.quantity,
  unit_price: line.unit_price,
  unit_material: line.unit_material,
  unit_labor: line.unit_labor,
  unit_freight: line.unit_freight,
  unit_incidental: line.unit_incidental,
  unit_cost: line.unit_cost,
  unit_price_target: line.unit_price_target,
  unit: line.unit,
  description: line.description,
  vendor_part_id: line.vendor_part_id,
});

const buildConditionDraft = (
  conditions: EstimateConditionFormRow[],
  conditionId: string,
): EstimateLinePreviewConditionDraft | undefined => {
  const path = findConditionPath(conditions, conditionId);
  if (!path) {
    return undefined;
  }

  let node: EstimateConditionFormRow | undefined;
  let nodes = conditions;
  for (const index of path) {
    node = nodes[index];
    nodes = node?.conditions ?? [];
  }
  if (!node) {
    return undefined;
  }

  return {
    complexity_factor_id: node.complexity_factor_id,
    labor_phases_explicit: node.labor_phases_explicit,
    included_labor_phases: node.included_labor_phases.map(
      (phase) => phase.labor_phase_id,
    ),
    specs: node.specs.map((spec) => ({
      spec_def_id: spec.spec_def_id,
      spec_option_id: spec.spec_option_id,
      value_boolean: spec.value_boolean,
      value_number: spec.value_number,
    })),
  };
};

const applyPreviewResults = (
  setValue: ReturnType<typeof useFormContext<EstimateLineEditorFormValues>>["setValue"],
  getValues: ReturnType<typeof useFormContext<EstimateLineEditorFormValues>>["getValues"],
  results: EstimateLinePreviewResultLine[],
): void => {
  const lines = getValues("line_items") ?? [];
  const byId = new Map(results.map((row) => [row.id, row]));

  lines.forEach((line, index) => {
    const preview = byId.get(line.id);
    if (!preview) {
      return;
    }
    for (const field of PREVIEW_FIELDS) {
      setValue(`line_items.${index}.${field}`, preview[field], {
        shouldDirty: true,
      });
    }
  });
};

export const useEstimateLinePreview = (estimateId: string | undefined) => {
  const { getValues, setValue } = useFormContext<EstimateLineEditorFormValues>();
  const [previewingIds, setPreviewingIds] = useState<Set<string>>(() => new Set());
  const seqRef = useRef(0);

  const runPreview = useCallback(
    async (
      conditionId: string,
      lines: EstimateLineFormRow[],
      options?: { includeDraft?: boolean },
    ) => {
      if (!estimateId || estimateId === "new" || lines.length === 0) {
        return;
      }

      const seq = ++seqRef.current;
      const ids = new Set(lines.map((line) => line.id));
      setPreviewingIds((prev) => new Set([...prev, ...ids]));

      try {
        const conditions = getValues("conditions") ?? [];
        const condition_draft = options?.includeDraft
          ? buildConditionDraft(conditions, conditionId)
          : undefined;

        const result = await fetchEstimateLinePreview(estimateId, {
          condition_id: conditionId,
          condition_draft,
          lines: lines.map(toPreviewLine),
        });

        if (seq !== seqRef.current) {
          return;
        }

        applyPreviewResults(setValue, getValues, result.data.lines);
      } catch {
        // Preview is best-effort; save-path recalc remains authoritative.
      } finally {
        if (seq === seqRef.current) {
          setPreviewingIds((prev) => {
            const next = new Set(prev);
            for (const id of ids) {
              next.delete(id);
            }
            return next;
          });
        }
      }
    },
    [estimateId, getValues, setValue],
  );

  const previewLineAt = useCallback(
    async (index: number) => {
      const lines = getValues("line_items") ?? [];
      const line = lines[index];
      if (!line?.estimate_condition_id || !line.item_id) {
        return;
      }
      await runPreview(line.estimate_condition_id, [line]);
    },
    [getValues, runPreview],
  );

  const previewConditionLines = useCallback(
    async (conditionId: string) => {
      const lines = (getValues("line_items") ?? []).filter(
        (line) => line.estimate_condition_id === conditionId && line.item_id,
      );
      await runPreview(conditionId, lines, { includeDraft: true });
    },
    [getValues, runPreview],
  );

  const isPreviewing = useCallback(
    (lineId: string) => previewingIds.has(lineId),
    [previewingIds],
  );

  return {
    previewLineAt,
    previewConditionLines,
    isPreviewing,
    previewingIds,
  };
};
