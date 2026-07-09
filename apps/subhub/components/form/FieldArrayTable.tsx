"use client";

import { DeleteOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type FieldId } from "@latch/contracts";
import { Can } from "@latch/react";
import { Button, Table } from "antd";
import type { TableProps } from "antd";
import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  useFieldArray,
  useFormContext,
  type ArrayPath,
  type FieldArray,
  type FieldArrayWithId,
  type FieldValues,
  type Path,
  type UseFieldArrayAppend,
  type UseFieldArrayMove,
  type UseFieldArrayRemove,
} from "react-hook-form";

import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";
import { useClientMounted } from "@/lib/hooks/use-client-mounted";

export type FieldArrayTableCellContext<
  T extends FieldValues,
  TName extends ArrayPath<T>,
> = {
  index: number;
  arrayName: TName;
  writable: boolean;
  loading: boolean;
  disabled: boolean;
};

export type FieldArrayTableColumn<
  T extends FieldValues,
  TName extends ArrayPath<T>,
> = {
  key: string;
  title: string;
  width?: number | string;
  render: (ctx: FieldArrayTableCellContext<T, TName>) => ReactNode;
};

type RowContextValue = {
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
  listeners?: ReturnType<typeof useSortable>["listeners"];
};

const RowContext = createContext<RowContextValue>({});

const DragHandle = () => {
  const { setActivatorNodeRef, listeners } = useContext(RowContext);

  return (
    <Button
      type="text"
      size="small"
      icon={<HolderOutlined />}
      aria-label="Drag to reorder"
      style={{ cursor: "move" }}
      ref={setActivatorNodeRef}
      {...listeners}
    />
  );
};

type SortableRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  "data-row-key": string;
};

const SortableRow = ({ children, ...props }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props["data-row-key"] });

  const style: CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 9999 } : {}),
  };

  return (
    <RowContext.Provider value={{ setActivatorNodeRef, listeners }}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes}>
        {children}
      </tr>
    </RowContext.Provider>
  );
};

type FieldArrayTableControls<
  T extends FieldValues,
  TName extends ArrayPath<T>,
> = {
  append: UseFieldArrayAppend<T, TName>;
  fields: FieldArrayWithId<T, TName, "id">[];
  move: UseFieldArrayMove;
  remove: UseFieldArrayRemove;
};

type FieldArrayTableProps<
  T extends FieldValues,
  TName extends ArrayPath<T>,
> = {
  field: FieldId;
  name: TName;
  columns: FieldArrayTableColumn<T, TName>[];
  createRow: () => FieldArray<T, TName>;
  addLabel?: string;
  size?: TableProps["size"];
  /** Enable drag-sort; requires stable row ids from useFieldArray. */
  orderable?: boolean;
  /** Form key updated on reorder (default `sort_order`, 1-based). */
  sortOrderKey?: string;
  /** Show footer add. Default: field write mode (child collections). */
  allowAdd?: boolean;
  /** Show row remove control. Default: field write mode (child collections). */
  allowRemove?: boolean;
  /** Parent-owned field array (skips an internal useFieldArray). */
  fieldArray?: FieldArrayTableControls<T, TName>;
};

const FieldArrayTableCore = <
  T extends FieldValues,
  TName extends ArrayPath<T>,
>({
  field,
  name,
  columns,
  createRow,
  addLabel = "Add row",
  size = "middle",
  orderable = false,
  sortOrderKey = "sort_order",
  allowAdd,
  allowRemove,
  fieldArray,
}: FieldArrayTableProps<T, TName> & {
  fieldArray: FieldArrayTableControls<T, TName>;
}) => {
  const mode = useFieldMode(field);
  const { getValues, setValue } = useFormContext<T>();
  const { fields, append, remove, move } = fieldArray;
  const { loading: formLoading, disabled } = useFormUi();
  const mounted = useClientMounted();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
  );

  const sortableIds = useMemo(() => fields.map((row) => row.id), [fields]);

  if (mode === "hidden") {
    return null;
  }

  const writable = mode === "write";
  const useFieldWriteGate = allowAdd === undefined && allowRemove === undefined;
  const allowAddRows = allowAdd ?? writable;
  const allowRemoveRows = allowRemove ?? writable;
  const canReorder = orderable && writable && mounted;

  const reindexSortOrder = () => {
    const current = getValues(name as Path<T>) as unknown as Array<
      Record<string, unknown>
    >;
    const next = current.map((row, index) => ({
      ...row,
      [sortOrderKey]: index + 1,
    }));
    setValue(name as Path<T>, next as Parameters<typeof setValue>[1], {
      shouldDirty: true,
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = fields.findIndex((row) => row.id === active.id);
    const newIndex = fields.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    move(oldIndex, newIndex);
    queueMicrotask(reindexSortOrder);
  };

  const tableColumns: TableProps<(typeof fields)[number]>["columns"] = [];

  if (canReorder) {
    tableColumns.push({
      key: "_drag",
      title: "",
      width: 48,
      align: "center" as const,
      render: () => <DragHandle />,
    });
  }

  tableColumns.push(
    ...columns.map((column) => ({
      key: column.key,
      title: column.title,
      width: column.width,
      render: (_value: unknown, _record: (typeof fields)[number], index: number) =>
        column.render({
          index,
          arrayName: name,
          writable,
          loading: formLoading,
          disabled,
        }),
    })),
  );

  if (allowRemoveRows) {
    tableColumns.push({
      key: "_actions",
      title: "",
      width: 48,
      align: "center" as const,
      render: (_value: unknown, _record: (typeof fields)[number], index: number) => {
        const button = (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="Remove row"
            disabled={disabled}
            onClick={() => remove(index)}
          />
        );

        return useFieldWriteGate ? (
          <Can field={field} action="write">
            {button}
          </Can>
        ) : (
          button
        );
      },
    });
  }

  const table = (
    <Table
      columns={tableColumns}
      dataSource={fields}
      rowKey="id"
      pagination={false}
      size={size}
      components={
        canReorder
          ? {
              body: {
                row: SortableRow,
              },
            }
          : undefined
      }
      footer={
        allowAddRows
          ? () => {
              const button = (
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  disabled={disabled}
                  onClick={() => append(createRow())}
                >
                  {addLabel}
                </Button>
              );

              return useFieldWriteGate ? (
                <Can field={field} action="write">
                  {button}
                </Can>
              ) : (
                button
              );
            }
          : undefined
      }
    />
  );

  if (!canReorder) {
    return table;
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        {table}
      </SortableContext>
    </DndContext>
  );
};

const FieldArrayTableConnected = <
  T extends FieldValues,
  TName extends ArrayPath<T>,
>(
  props: FieldArrayTableProps<T, TName>,
) => {
  const { control } = useFormContext<T>();
  const fieldArray = useFieldArray({ control, name: props.name });
  return <FieldArrayTableCore {...props} fieldArray={fieldArray} />;
};

export const FieldArrayTable = <
  T extends FieldValues,
  TName extends ArrayPath<T>,
>(props: FieldArrayTableProps<T, TName>) => {
  if (props.fieldArray) {
    return <FieldArrayTableCore {...props} fieldArray={props.fieldArray} />;
  }
  return <FieldArrayTableConnected {...props} />;
};

export const LaborPhaseAddButton = ({
  disabled,
  onClick,
  label = "Add labor phase",
}: {
  disabled?: boolean;
  label?: string;
  onClick: () => void;
}) => (
  <Button type="dashed" block icon={<PlusOutlined />} disabled={disabled} onClick={onClick}>
    {label}
  </Button>
);
