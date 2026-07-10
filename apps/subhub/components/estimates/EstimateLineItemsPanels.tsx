"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { EstimateBucketConfigurePanel } from "@/components/estimates/EstimateBucketConfigurePanel";
import { EstimateLineFlatTable } from "@/components/estimates/EstimateLineFlatTable";
import { EstimateQuoteStructureTree } from "@/components/estimates/EstimateQuoteStructureTree";
import type { EstimateLineEditorFormValues } from "@/components/estimates/estimate-line-tree";
import {
  defaultBucketSelection,
  type EstimateBucketSelection,
} from "@/components/estimates/estimate-line-selection";
import { useFormUi } from "@/components/surface/useFormUi";

type EstimateLineItemsPanelsProps = {
  manifest: Manifest;
  siteId?: string;
  siteSelected?: boolean;
};

const TOP_ROW_MAX_HEIGHT = 320;

export const EstimateLineItemsPanels = ({
  manifest,
  siteSelected = true,
}: EstimateLineItemsPanelsProps) => {
  const { control } = useFormContext<EstimateLineEditorFormValues>();
  const { disabled } = useFormUi();

  const conditions = useWatch({ control, name: "conditions" }) ?? [];
  const [selection, setSelection] = useState<EstimateBucketSelection | null>(null);

  const writableConditions = fieldAllows(manifest, "conditions", "write");

  const defaultSelection = useMemo(
    () => defaultBucketSelection(conditions),
    [conditions],
  );

  useEffect(() => {
    if (!conditions.length) {
      setSelection(null);
      return;
    }

    setSelection((current) => {
      if (!current) {
        return defaultSelection;
      }
      const stillThere = JSON.stringify(conditions).includes(
        current.estimateConditionId,
      );
      return stillThere ? current : defaultSelection;
    });
  }, [conditions, defaultSelection]);

  if (!siteSelected) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minHeight: 480,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "stretch",
          maxHeight: TOP_ROW_MAX_HEIGHT,
          minHeight: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          <EstimateQuoteStructureTree
            selection={selection}
            writable={writableConditions}
            disabled={disabled}
            onSelect={setSelection}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          <EstimateBucketConfigurePanel
            disabled={disabled}
            selection={selection}
            writable={writableConditions}
          />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {conditions.length === 0 ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Add a root condition in Structure to add line items.
          </Typography.Paragraph>
        ) : (
          <EstimateLineFlatTable manifest={manifest} selection={selection} />
        )}
      </div>
    </div>
  );
};
