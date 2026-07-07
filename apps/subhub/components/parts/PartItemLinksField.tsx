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

import {
  FieldArrayTable,
  type FieldArrayTableColumn,
} from "@/components/form/FieldArrayTable";
import { FormSection } from "@/components/form/FormSection";
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
    children: node.children ? toAntdTree(node.children) : undefined,
  }));

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

const ItemCell = ({
  index,
  writable,
  disabled,
  loading,
  treeData,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
  loading: boolean;
  treeData: TreeSelectProps["treeData"];
}) => {
  const { setValue, watch } = useFormContext<PartItemLinksFormValues>();
  const itemId = watch(`item_links.${index}.item_id`);

  return (
    <Controller<PartItemLinksFormValues>
      name={`item_links.${index}.item_id`}
      render={({ field, fieldState }) => {
        if (loading) {
          return <Skeleton.Input active size="small" block />;
        }

        if (!writable) {
          return (
            <Typography.Text>
              {findTreeTitle(treeData, itemId) || watch(`item_links.${index}.name`) || "—"}
            </Typography.Text>
          );
        }

        return (
          <TreeSelect
            size="small"
            style={{ width: "100%" }}
            treeData={treeData}
            value={typeof field.value === "string" ? field.value : undefined}
            disabled={disabled}
            placeholder="Select item"
            treeDefaultExpandAll
            status={fieldState.error ? "error" : undefined}
            onChange={(value) => {
              field.onChange(value);
              const title = findTreeTitle(treeData, value as string);
              setValue(`item_links.${index}.name`, title === "—" ? "" : title, {
                shouldDirty: true,
              });
            }}
            onBlur={field.onBlur}
          />
        );
      }}
    />
  );
};

export const PartItemLinksField = ({ manifest }: PartItemLinksFieldProps) => {
  const { watch } = useFormContext<PartItemLinksFormValues>();
  const itemLinks = watch("item_links") ?? [];
  const { data: itemTree, isLoading } = useItemTreePicker();

  const treeData = useMemo(() => toAntdTree(itemTree ?? []), [itemTree]);
  const writable = fieldAllows(manifest, "item_links", "write");

  const columns = useMemo<
    FieldArrayTableColumn<PartItemLinksFormValues, "item_links">[]
  >(
    () => [
      {
        key: "item",
        title: "Item",
        width: "34%",
        render: ({ index, writable: rowWritable, disabled, loading }) => (
          <ItemCell
            index={index}
            writable={rowWritable}
            disabled={disabled}
            loading={loading || isLoading}
            treeData={treeData}
          />
        ),
      },
      {
        key: "breadcrumb",
        title: "Path",
        render: ({ index, loading }) => {
          if (loading) {
            return <Skeleton.Input active size="small" block />;
          }

          const breadcrumb = watch(`item_links.${index}.breadcrumb`);
          const name = watch(`item_links.${index}.name`);
          return (
            <Typography.Text type="secondary">
              {breadcrumb || name || "—"}
            </Typography.Text>
          );
        },
      },
    ],
    [isLoading, treeData, watch],
  );

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

  return (
    <FieldControl manifest={manifest} field="item_links">
      <FormSection title="Item links">
        {emptyState}
        <FieldArrayTable<PartItemLinksFormValues, "item_links">
          field="item_links"
          name="item_links"
          columns={columns}
          createRow={() => ({
            item_id: "",
            name: "",
            breadcrumb: "",
          })}
          addLabel="Add item"
          allowAdd={writable}
        />
      </FormSection>
    </FieldControl>
  );
};
