"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { Checkbox, Tree, Typography } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import { useCallback, useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import {
  type EstimateLineEditorFormValues,
  type EstimateScopeFormRow,
} from "@/components/estimates/estimate-line-tree";
import { EstimateScopeSpecFields } from "@/components/estimates/EstimateScopeSpecFields";
import {
  buildEstimateScopeTree,
  findScopeIndexBySiteScopeId,
  isScopeChecked,
  isZoneChecked,
  makeScopeRow,
  makeZoneMembership,
  scopeReferencedByLines,
  toAntdScopeTreeData,
  type EstimateScopeAntdTreeNode,
  zoneReferencedByLines,
} from "@/components/estimates/estimate-scope-tree";
import { FormSection } from "@/components/form/FormSection";
import { useFormUi } from "@/components/surface/useFormUi";

type EstimateScopeTabProps = {
  manifest: Manifest;
};

type SelectionState = {
  scopeIndex?: number;
  zoneIndex?: number;
};

export const EstimateScopeTab = ({ manifest }: EstimateScopeTabProps) => {
  const { control, getValues } = useFormContext<EstimateLineEditorFormValues>();
  const { fields: scopeFields, replace: replaceScopes } = useFieldArray({
    control,
    name: "scopes",
  });
  const { disabled } = useFormUi();

  const siteTree = useWatch({ control, name: "site_tree" });
  const scopes = (useWatch({ control, name: "scopes" }) ?? []) as EstimateScopeFormRow[];
  const lineItems = useWatch({ control, name: "line_items" }) ?? [];

  const [selection, setSelection] = useState<SelectionState>({});

  const writable = fieldAllows(manifest, "scopes", "write");
  const treeNodes = useMemo(() => buildEstimateScopeTree(siteTree), [siteTree]);
  const antdTreeData = useMemo(() => toAntdScopeTreeData(treeNodes), [treeNodes]);

  const ensureScopeChecked = useCallback(
    (
      siteScopeId: string,
      rootCategoryId: string,
      rootCategoryName: string | null,
      siteScopeName: string | null,
    ): EstimateScopeFormRow[] => {
      const current = getValues("scopes") ?? [];
      const existingIndex = findScopeIndexBySiteScopeId(current, siteScopeId);
      if (existingIndex >= 0) {
        return current;
      }

      const nextScope = makeScopeRow(
        siteScopeId,
        rootCategoryId,
        rootCategoryName,
        siteScopeName,
        current.length + 1,
        rootCategoryId && siteTree?.spec_templates?.[rootCategoryId]
          ? siteTree.spec_templates[rootCategoryId].map((spec) => ({ ...spec }))
          : [],
      );

      return [...current, nextScope];
    },
    [getValues, siteTree?.spec_templates],
  );

  const toggleScope = useCallback(
    (siteScopeId: string, checked: boolean, meta: {
      rootCategoryId: string;
      rootCategoryName: string | null;
      siteScopeName: string | null;
    }) => {
      const current = getValues("scopes") ?? [];

      if (!checked) {
        if (scopeReferencedByLines(current, lineItems, siteScopeId)) {
          return;
        }

        const next = current.filter(
          (scope) => scope.site_scope_id !== siteScopeId,
        );
        replaceScopes(next.map((scope, index) => ({ ...scope, sort_order: index + 1 })));
        setSelection({});
        return;
      }

      const next = ensureScopeChecked(
        siteScopeId,
        meta.rootCategoryId,
        meta.rootCategoryName,
        meta.siteScopeName,
      );
      replaceScopes(next);
    },
    [ensureScopeChecked, getValues, lineItems, replaceScopes],
  );

  const toggleZone = useCallback(
    (
      siteScopeId: string,
      zoneId: string,
      checked: boolean,
      meta: {
        rootCategoryId: string;
        rootCategoryName: string | null;
        siteScopeName: string | null;
      },
    ) => {
      let current = getValues("scopes") ?? [];

      if (!checked) {
        if (zoneReferencedByLines(lineItems, zoneId)) {
          return;
        }

        const scopeIndex = findScopeIndexBySiteScopeId(current, siteScopeId);
        if (scopeIndex < 0) {
          return;
        }

        const scope = current[scopeIndex];
        if (!scope) {
          return;
        }

        const nextZones = scope.zones.filter((zone) => zone.site_zone_id !== zoneId);
        const next = [...current];
        next[scopeIndex] = { ...scope, zones: nextZones };

        if (nextZones.length === 0) {
          next.splice(scopeIndex, 1);
        }

        replaceScopes(next.map((row, index) => ({ ...row, sort_order: index + 1 })));
        setSelection({});
        return;
      }

      current = ensureScopeChecked(
        siteScopeId,
        meta.rootCategoryId,
        meta.rootCategoryName,
        meta.siteScopeName,
      );

      const scopeIndex = findScopeIndexBySiteScopeId(current, siteScopeId);
      if (scopeIndex < 0) {
        return;
      }

      const scope = current[scopeIndex];
      if (!scope) {
        return;
      }

      if (scope.zones.some((zone) => zone.site_zone_id === zoneId)) {
        return;
      }

      const next = [...current];
      next[scopeIndex] = {
        ...scope,
        zones: [
          ...scope.zones,
          {
            ...makeZoneMembership(zoneId, scope.zones.length + 1),
            specs:
              meta.rootCategoryId && siteTree?.spec_templates?.[meta.rootCategoryId]
                ? siteTree.spec_templates[meta.rootCategoryId].map((spec) => ({ ...spec }))
                : [],
          },
        ],
      };
      replaceScopes(next);
    },
    [ensureScopeChecked, getValues, lineItems, replaceScopes, siteTree?.spec_templates],
  );

  const labelByKey = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: ReturnType<typeof buildEstimateScopeTree>) => {
      for (const node of nodes) {
        if (node.label) {
          map.set(node.key, node.label);
        }
        if (node.children) {
          walk(node.children);
        }
      }
    };
    walk(treeNodes);
    return map;
  }, [treeNodes]);

  const renderTreeTitle = useCallback(
    (node: EstimateScopeAntdTreeNode) => {
      const label = labelByKey.get(String(node.key)) ?? "";
      if (node.rowKind === "scope") {
        const siteScopeId = node.siteScopeId as string;
        const checked = isScopeChecked(scopes, siteScopeId);
        const scopeBlocked =
          checked && scopeReferencedByLines(scopes, lineItems, siteScopeId);

        const siteScopeMeta = {
          rootCategoryId:
            siteTree?.scopes.find((scope) => scope.id === siteScopeId)?.root_category_id ??
            "",
          rootCategoryName: null as string | null,
          siteScopeName: label,
        };

        return (
          <div
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={(event) => {
              event.stopPropagation();
              if (node.scopeIndex !== undefined) {
                const scopeIndex = findScopeIndexBySiteScopeId(scopes, siteScopeId);
                if (scopeIndex >= 0) {
                  setSelection({ scopeIndex });
                }
              }
            }}
          >
            <Checkbox
              checked={checked}
              disabled={disabled || !writable || (checked && scopeBlocked)}
              onChange={(event: CheckboxChangeEvent) => {
                toggleScope(siteScopeId, event.target.checked, siteScopeMeta);
              }}
              onClick={(event) => event.stopPropagation()}
            />
            <Typography.Text strong>{label}</Typography.Text>
          </div>
        );
      }

      if (node.rowKind === "zone" && node.zoneId) {
        const siteScopeId = node.siteScopeId as string;
        const checked = isZoneChecked(scopes, siteScopeId, node.zoneId);
        const zoneBlocked = checked && zoneReferencedByLines(lineItems, node.zoneId);

        const siteScopeMeta = {
          rootCategoryId:
            siteTree?.scopes.find((scope) => scope.id === siteScopeId)?.root_category_id ??
            "",
          rootCategoryName: null as string | null,
          siteScopeName:
            siteTree?.scopes.find((scope) => scope.id === siteScopeId)?.name ?? null,
        };

        return (
          <div
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={(event) => {
              event.stopPropagation();
              const scopeIndex = findScopeIndexBySiteScopeId(scopes, siteScopeId);
              if (scopeIndex < 0) {
                return;
              }

              const zoneIndex = scopes[scopeIndex]?.zones.findIndex(
                (zone) => zone.site_zone_id === node.zoneId,
              );
              if (zoneIndex !== undefined && zoneIndex >= 0) {
                setSelection({ scopeIndex, zoneIndex });
              }
            }}
          >
            <Checkbox
              checked={checked}
              disabled={disabled || !writable || (checked && zoneBlocked)}
              onChange={(event: CheckboxChangeEvent) => {
                toggleZone(siteScopeId, node.zoneId as string, event.target.checked, siteScopeMeta);
              }}
              onClick={(event) => event.stopPropagation()}
            />
            <Typography.Text>{label}</Typography.Text>
          </div>
        );
      }

      return label;
    },
    [disabled, labelByKey, lineItems, scopes, siteTree, toggleScope, toggleZone, writable],
  );

  const selectedScopeIndex = selection.scopeIndex;
  const selectedScope =
    selectedScopeIndex !== undefined ? scopes[selectedScopeIndex] : undefined;
  const showScopeSpecs =
    selectedScope !== undefined && selection.zoneIndex === undefined;
  const showZoneSpecs =
    selectedScope !== undefined && selection.zoneIndex !== undefined;

  if (!siteTree) {
    return (
      <Typography.Paragraph type="secondary">
        Site geography is unavailable.
      </Typography.Paragraph>
    );
  }

  return (
    <FormSection title="Scopes & zones">
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Check site scopes and zones to include on this quote. Unchecking is blocked when line
        items reference a scope or zone.
      </Typography.Paragraph>

      <Tree
        blockNode
        defaultExpandAll
        selectable={false}
        treeData={antdTreeData}
        titleRender={(node) => renderTreeTitle(node as EstimateScopeAntdTreeNode)}
      />

      {showScopeSpecs && selectedScopeIndex !== undefined ? (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
            Scope specs
          </Typography.Text>
          <EstimateScopeSpecFields
            scopeIndex={selectedScopeIndex}
            writable={writable}
            disabled={disabled}
          />
        </div>
      ) : null}

      {showZoneSpecs &&
      selectedScopeIndex !== undefined &&
      selection.zoneIndex !== undefined ? (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
            Zone specs
          </Typography.Text>
          <EstimateScopeSpecFields
            scopeIndex={selectedScopeIndex}
            zoneIndex={selection.zoneIndex}
            writable={writable}
            disabled={disabled}
          />
        </div>
      ) : null}

      {scopeFields.length === 0 ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          No scopes checked — check at least one scope before adding line items.
        </Typography.Paragraph>
      ) : null}
    </FormSection>
  );
};
