"use client";

import { useCallback, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

import type {
  EstimateLineEditorFormValues,
  EstimateLineFormRow,
} from "@/components/estimates/estimate-line-tree";
import { buildConditionDraft } from "@/lib/estimates/condition-draft";
import {
  fetchEstimateLinePreview,
  type EstimateLinePreviewResultLine,
} from "@/lib/surface-api";

/** Preview money/part fields returned by the server line-preview endpoint. */
const PREVIEW_FIELDS = [
  "part_id",
  "vendor_part_id",
  "material_locked",
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
        // Always prefer form condition state so preview matches Part Select draft filter.
        const condition_draft =
          options?.includeDraft === false
            ? undefined
            : buildConditionDraft(conditions, conditionId);

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
      await runPreview(line.estimate_condition_id, [line], { includeDraft: true });
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
