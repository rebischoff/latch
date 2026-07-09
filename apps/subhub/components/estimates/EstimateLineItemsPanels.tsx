"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { Typography } from "antd";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { EstimateBucketConfigurePanel } from "@/components/estimates/EstimateBucketConfigurePanel";
import { EstimateLineFlatTable } from "@/components/estimates/EstimateLineFlatTable";
import { EstimateQuoteStructureTree } from "@/components/estimates/EstimateQuoteStructureTree";
import type { EstimateLineEditorFormValues } from "@/components/estimates/estimate-line-tree";
import {
  defaultBucketSelection,
  ensureBucketIncluded,
  type EstimateBucketBinding,
  type EstimateBucketSelection,
} from "@/components/estimates/estimate-line-selection";
import { FormSection } from "@/components/form/FormSection";
import { routes } from "@/lib/nav-routes";
import { useFormUi } from "@/components/surface/useFormUi";

type EstimateLineItemsPanelsProps = {
  manifest: Manifest;
  siteId?: string;
  siteSelected?: boolean;
};

const TOP_ROW_MAX_HEIGHT = 320;

export const EstimateLineItemsPanels = ({
  manifest,
  siteId,
  siteSelected = true,
}: EstimateLineItemsPanelsProps) => {
  const { control } = useFormContext<EstimateLineEditorFormValues>();
  const { replace: replaceScopes } = useFieldArray({ control, name: "scopes" });
  const { disabled } = useFormUi();

  const scopes = useWatch({ control, name: "scopes" }) ?? [];
  const siteTree = useWatch({ control, name: "site_tree" });
  const [selection, setSelection] = useState<EstimateBucketSelection | null>(null);
  const [, setIncludeTick] = useState(0);

  const writableScopes = fieldAllows(manifest, "scopes", "write");

  const defaultSelection = useMemo(() => defaultBucketSelection(siteTree), [siteTree]);

  useEffect(() => {
    if (!siteTree?.scopes?.length) {
      setSelection(null);
      return;
    }

    setSelection((current) => current ?? defaultSelection);
  }, [defaultSelection, siteTree?.scopes?.length]);

  const ensureIncluded = useCallback((): EstimateBucketBinding | null => {
    if (!selection) {
      return null;
    }

    const result = ensureBucketIncluded(scopes, siteTree, selection);
    if (!result) {
      return null;
    }

    if (result.scopes !== scopes) {
      replaceScopes(result.scopes);
      setIncludeTick((tick) => tick + 1);
    }

    return result.binding;
  }, [replaceScopes, scopes, selection, siteTree]);

  const handleEnsureIncluded = useCallback(() => {
    setIncludeTick((tick) => tick + 1);
  }, []);

  if (!siteSelected) {
    return null;
  }

  if (!siteTree?.scopes?.length) {
    return (
      <FormSection title="Line items">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          This site has no scopes.{" "}
          {siteId ? (
            <Link href={routes.sites.detail(siteId)}>Add scopes &amp; zones on the site</Link>
          ) : (
            "Select a site with scopes to build a quote."
          )}
        </Typography.Paragraph>
      </FormSection>
    );
  }

  return (
    <FormSection title="Line items">
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
              siteTree={siteTree}
              onSelect={setSelection}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
            <EstimateBucketConfigurePanel
              disabled={disabled}
              selection={selection}
              writable={writableScopes}
              ensureIncluded={ensureIncluded}
            />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <EstimateLineFlatTable
            manifest={manifest}
            selection={selection}
            onEnsureIncluded={handleEnsureIncluded}
          />
        </div>
      </div>
    </FormSection>
  );
};
