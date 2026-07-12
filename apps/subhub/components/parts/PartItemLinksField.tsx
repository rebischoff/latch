"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { FieldControl } from "@latch/react";
import { Skeleton, TreeSelect, Typography } from "antd";
import type { TreeSelectProps } from "antd";
import { useMemo } from "react";
import {
  Controller,
  useFormContext,
  type FieldPath,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form";

import { FormSection } from "@/components/form/FormSection";
import { TABLE_WIDTH_LG } from "@/components/form/formLayout";
import { findTreeTitle } from "@/components/form/optionHelpers";
import { useItemTreePicker } from "@/lib/hooks/use-item-tree-picker";
import type { PartItemTreePickerNode } from "@/lib/surface-api";

export type ItemLinkFormRow = {
  breadcrumb?: string;
  item_id: string;
  name?: string;
  sort_order?: number;
};

export type PartItemLinksFormValues = {
  item_links: ItemLinkFormRow[];
};

type PartItemLinksFieldProps = {
  manifest: Manifest;
};

const toAntdTree = (
  nodes: PartItemTreePickerNode[],
): TreeSelectProps["treeData"] =>
  nodes.map((node) => ({
    value: node.value,
    title: node.label,
    selectable: node.selectable,
    disableCheckbox: !node.selectable,
    children: node.children ? toAntdTree(node.children) : undefined,
  }));

const findTreePath = (
  treeData: TreeSelectProps["treeData"],
  value: string,
): string | undefined => {
  const walk = (
    nodes: TreeSelectProps["treeData"],
    ancestors: string[],
  ): string | undefined => {
    for (const node of nodes ?? []) {
      const title =
        typeof node?.title === "string" ? node.title : String(node?.value ?? "");
      const path = [...ancestors, title];
      if (node?.value === value) {
        return path.join(" / ");
      }
      const childMatch = walk(node?.children, path);
      if (childMatch) {
        return childMatch;
      }
    }
    return undefined;
  };

  return walk(treeData, []);
};

export const validateItemLinkDuplicates = <T extends FieldValues>(
  rows: ItemLinkFormRow[],
  setError: UseFormSetError<T>,
): boolean => {
  const seen = new Map<string, number>();
  let valid = true;

  rows.forEach((row, index) => {
    if (!row.item_id) {
      return;
    }

    const priorIndex = seen.get(row.item_id);
    if (priorIndex !== undefined) {
      const message = "This item is already linked";
      setError(`item_links.${index}.item_id` as FieldPath<T>, { message });
      setError(`item_links.${priorIndex}.item_id` as FieldPath<T>, { message });
      valid = false;
    } else {
      seen.set(row.item_id, index);
    }
  });

  return valid;
};

const linksFromSelectedIds = (
  selectedIds: string[],
  previous: ItemLinkFormRow[],
  treeData: TreeSelectProps["treeData"],
): ItemLinkFormRow[] => {
  const previousById = new Map(
    previous.filter((row) => row.item_id).map((row) => [row.item_id, row]),
  );

  return selectedIds.map((itemId, index) => {
    const prior = previousById.get(itemId);
    const title = findTreeTitle(treeData, itemId);
    const name = title === "—" ? (prior?.name ?? "") : title;
    return {
      item_id: itemId,
      name,
      breadcrumb: findTreePath(treeData, itemId) ?? prior?.breadcrumb ?? name,
      sort_order: index + 1,
    };
  });
};

export const PartItemLinksField = ({ manifest }: PartItemLinksFieldProps) => {
  const { control, watch } = useFormContext<PartItemLinksFormValues>();
  const itemLinks = watch("item_links") ?? [];
  const { data: itemTree, isLoading } = useItemTreePicker();

  const treeData = useMemo(() => toAntdTree(itemTree ?? []), [itemTree]);
  const writable = fieldAllows(manifest, "item_links", "write");

  const emptyState =
    itemLinks.length === 0 ? (
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Not assigned to any items — add an item to include this part in estimate
        resolution.
      </Typography.Paragraph>
    ) : (
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Saving updates compatibility specs for linked items.
      </Typography.Paragraph>
    );

  const readOnlyLabels =
    itemLinks.length === 0
      ? "—"
      : itemLinks
          .map((row) => row.breadcrumb || row.name || row.item_id)
          .filter(Boolean)
          .join("; ");

  return (
    <FieldControl manifest={manifest} field="item_links">
      <FormSection title="Item links" width="full">
        {emptyState}
        {isLoading ? (
          <Skeleton.Input active size="small" block />
        ) : !writable ? (
          <Typography.Text>{readOnlyLabels}</Typography.Text>
        ) : (
          <Controller
            control={control}
            name="item_links"
            render={({ field, fieldState }) => {
              const currentRows: ItemLinkFormRow[] = Array.isArray(field.value)
                ? field.value
                : [];
              const selectedIds = currentRows
                .map((row) => row.item_id)
                .filter(Boolean);

              return (
                <TreeSelect
                  allowClear
                  multiple
                  treeCheckable
                  showCheckedStrategy={TreeSelect.SHOW_CHILD}
                  size="small"
                  style={{ width: "100%", maxWidth: TABLE_WIDTH_LG }}
                  treeData={treeData}
                  value={selectedIds}
                  placeholder="Select leaf items"
                  treeDefaultExpandAll
                  maxTagCount="responsive"
                  status={fieldState.error ? "error" : undefined}
                  onChange={(values) => {
                    const ids = (Array.isArray(values) ? values : []).filter(
                      (value): value is string => typeof value === "string",
                    );
                    field.onChange(linksFromSelectedIds(ids, currentRows, treeData));
                  }}
                  onBlur={field.onBlur}
                />
              );
            }}
          />
        )}
      </FormSection>
    </FieldControl>
  );
};
