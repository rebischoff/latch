"use client";

import { DeleteOutlined, DownOutlined, PlusOutlined } from "@ant-design/icons";
import { fieldAllows, type Manifest } from "@latch/contracts";
import { Button, Dropdown, Input, Space, Tree, Typography } from "antd";
import type { InputRef, TreeProps } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import {
  buildScopesTree,
  formatScopeInstanceLabel,
  getZoneById,
  insertZoneChild,
  makeScopeRow,
  makeZoneRow,
  removeZoneById,
  reorderScopes,
  reorderZoneSiblings,
  scopeSiblingIds,
  siblingZoneIds,
  toAntdTreeData,
  updateZoneById,
  type SiteScopesAntdTreeNode,
  type SiteZoneFormRow,
  type SiteScopesFormValues,
} from "@/components/sites/site-scopes-tree";
import { SURFACE_CONTROL_MAX_WIDTH } from "@/components/form/formLayout";
import { useFormUi } from "@/components/surface/useFormUi";
import { useItemRootPicker } from "@/lib/hooks/use-item-root-picker";

type SiteScopesZonesTreeProps = {
  manifest: Manifest;
};

const TREE_INDENT_PX = 24;
const TREE_DELETE_COL_WIDTH = 32;
const TREE_ROW_GAP = 8;
const TREE_ROW_WIDTH = SURFACE_CONTROL_MAX_WIDTH + TREE_DELETE_COL_WIDTH + TREE_ROW_GAP;

type ScopesNameInputProps = {
  rowKey: string;
  value: string;
  readOnlyLabel?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSelectRow: () => void;
  placeholder: string;
  disabled: boolean;
  emphasis?: boolean;
  editingKey: string | null;
  setEditingKey: (key: string | null) => void;
  focusEditKeyRef: MutableRefObject<string | null>;
};

const ScopesNameInput = ({
  rowKey,
  value,
  readOnlyLabel,
  onChange,
  onBlur,
  onSelectRow,
  placeholder,
  disabled,
  emphasis = false,
  editingKey,
  setEditingKey,
  focusEditKeyRef,
}: ScopesNameInputProps) => {
  const inputRef = useRef<InputRef | null>(null);
  const isEditing = editingKey === rowKey && !disabled;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  return (
    <Input
      ref={(element: InputRef | null) => {
        inputRef.current = element;
        if (focusEditKeyRef.current === rowKey && element) {
          setEditingKey(rowKey);
          onSelectRow();
          element.focus();
          focusEditKeyRef.current = null;
        }
      }}
      value={isEditing ? value : (readOnlyLabel ?? value)}
      readOnly={!isEditing}
      variant={isEditing ? "outlined" : "borderless"}
      disabled={disabled}
      placeholder={placeholder}
      onClick={(event) => {
        event.stopPropagation();
        onSelectRow();
        if (!disabled && !isEditing) {
          setEditingKey(rowKey);
        }
      }}
      onChange={(event) => onChange(event.target.value)}
      onFocus={(event) => {
        event.stopPropagation();
        onSelectRow();
        if (!disabled) {
          setEditingKey(rowKey);
        }
      }}
      onBlur={() => {
        setEditingKey(null);
        onBlur?.();
      }}
      style={{
        width: "100%",
        fontWeight: emphasis && !isEditing ? 600 : undefined,
      }}
    />
  );
};

type ScopesNameRowProps = {
  depth: number;
  children: ReactNode;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteLabel: string;
};

const ScopesNameRow = ({
  depth,
  children,
  onDelete,
  deleteDisabled,
  deleteLabel,
}: ScopesNameRowProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: TREE_ROW_GAP,
      width: TREE_ROW_WIDTH,
      marginLeft: -(depth * TREE_INDENT_PX),
      paddingLeft: depth * TREE_INDENT_PX,
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    <div
      style={{
        width: TREE_DELETE_COL_WIDTH,
        flexShrink: 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      {onDelete ? (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          aria-label={deleteLabel}
          disabled={deleteDisabled}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        />
      ) : null}
    </div>
  </div>
);

export const SiteScopesZonesTree = ({ manifest }: SiteScopesZonesTreeProps) => {
  const { control, getValues, setValue } = useFormContext<SiteScopesFormValues>();
  const { append: appendScope } = useFieldArray({
    control,
    name: "scopes",
  });
  const { disabled } = useFormUi();
  const focusEditKeyRef = useRef<string | null>(null);

  const watchedScopes = useWatch({ control, name: "scopes" }) as
    | SiteScopesFormValues["scopes"]
    | undefined;

  const scopes = useMemo(
    () =>
      (watchedScopes ?? []).map((scope) => ({
        ...scope,
        zones: scope.zones ?? [],
      })),
    [watchedScopes],
  );

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const { data: rootPicker, isLoading: rootPickerLoading } = useItemRootPicker();

  const writableScopes = fieldAllows(manifest, "scopes", "write");
  const writable = writableScopes;

  const scopesValues = useMemo(() => ({ scopes }), [scopes]);

  const treeData = useMemo(() => toAntdTreeData(buildScopesTree(scopes)), [scopes]);

  const rootItemOptions = useMemo(
    () =>
      (rootPicker?.data.rows ?? []).map((row) => ({
        key: row.id,
        label: row.name,
      })),
    [rootPicker?.data.rows],
  );

  const hasScopeRoots = rootItemOptions.length > 0;

  const selectRow = useCallback((key: string) => {
    setSelectedKeys([key]);
  }, []);

  const applyScopes = useCallback(
    (next: SiteScopesFormValues) => {
      setValue("scopes", next.scopes, { shouldDirty: true });
    },
    [setValue],
  );

  const addZoneUnder = useCallback(
    (parentKey: string) => {
      const row = makeZoneRow();
      const rowKey = `zone:${row.id}`;
      focusEditKeyRef.current = rowKey;
      const current = {
        scopes: getValues("scopes") ?? [],
      };
      applyScopes(insertZoneChild(current, parentKey, row));
      setSelectedKeys([rowKey]);
    },
    [applyScopes, getValues],
  );

  const addRootScope = useCallback(
    (rootItemId: string) => {
      const rootRow = rootPicker?.data.rows.find((row) => row.id === rootItemId);
      if (!rootRow) {
        return;
      }

      const nextSortOrder = (getValues("scopes") ?? []).length + 1;
      const block = makeScopeRow(rootRow.id, rootRow.name, nextSortOrder);
      const rowKey = `scope:${block.id}`;
      focusEditKeyRef.current = rowKey;
      appendScope(block);
      setSelectedKeys([rowKey]);
    },
    [appendScope, getValues, rootPicker?.data.rows],
  );

  const removeScopeById = useCallback(
    (scopeId: string) => {
      const beforeScopes = getValues("scopes") ?? [];
      const scope = beforeScopes.find((row) => row.id === scopeId);
      if (!scope || !scope.can_delete) {
        return;
      }

      const nextScopes = beforeScopes
        .filter((row) => Boolean(row.id) && row.id !== scopeId)
        .map((row, index) => ({
          ...row,
          sort_order: index + 1,
        }));
      setValue("scopes", nextScopes, { shouldDirty: true });

      const rowKey = `scope:${scope.id}`;
      if (selectedKeys.includes(rowKey)) {
        setSelectedKeys([]);
      }
      if (editingKey === rowKey) {
        setEditingKey(null);
      }
    },
    [editingKey, getValues, selectedKeys, setValue],
  );

  const removeZone = useCallback(
    (zoneId: string) => {
      const current = {
        scopes: getValues("scopes") ?? [],
      };
      const zone = getZoneById(current, zoneId);
      if (zone && !zone.can_delete) {
        return;
      }

      applyScopes(removeZoneById(current, zoneId));

      const rowKey = `zone:${zoneId}`;
      if (selectedKeys.includes(rowKey)) {
        setSelectedKeys([]);
      }
      if (editingKey === rowKey) {
        setEditingKey(null);
      }
    },
    [applyScopes, editingKey, getValues, selectedKeys],
  );

  const onZoneFieldChange = useCallback(
    (zoneId: string, patch: Partial<SiteZoneFormRow>) => {
      const current = {
        scopes: getValues("scopes") ?? [],
      };
      applyScopes(
        updateZoneById(current, zoneId, (zone) => ({
          ...zone,
          ...patch,
        })),
      );
    },
    [applyScopes, getValues],
  );

  const selectedKey = selectedKeys[0] ?? null;

  const canAddZone =
    selectedKey !== null &&
    (selectedKey.startsWith("scope:") || selectedKey.startsWith("zone:"));

  const handleAddZone = () => {
    if (!canAddZone || !selectedKey) {
      return;
    }
    addZoneUnder(selectedKey);
  };

  const addScopeMenu = {
    items: rootItemOptions,
    onClick: ({ key }: { key: string }) => addRootScope(key),
  };

  const allowDrop = useCallback<NonNullable<TreeProps<SiteScopesAntdTreeNode>["allowDrop"]>>(
    ({ dragNode, dropNode, dropPosition }) => {
      if (dropPosition === 0) {
        return false;
      }

      const dragKey = String(dragNode.key);
      const dropKey = String(dropNode.key);

      if (dragKey.startsWith("scope:")) {
        return dropKey.startsWith("scope:");
      }

      if (dragKey.startsWith("zone:")) {
        if (!dropKey.startsWith("zone:")) {
          return false;
        }
        const dragId = dragKey.replace(/^zone:/, "");
        const dropId = dropKey.replace(/^zone:/, "");
        return siblingZoneIds(scopesValues, dragId).includes(dropId);
      }

      return false;
    },
    [scopesValues],
  );

  const onDrop = useCallback<NonNullable<TreeProps<SiteScopesAntdTreeNode>["onDrop"]>>(
    (info) => {
      if (!info.dropToGap) {
        return;
      }

      const dragKey = String(info.dragNode.key);
      const dropKey = String(info.node.key);

      if (dragKey.startsWith("scope:") && dropKey.startsWith("scope:")) {
        const dragId = dragKey.replace(/^scope:/, "");
        const dropId = dropKey.replace(/^scope:/, "");
        const ids = scopeSiblingIds(scopes);
        const fromIndex = ids.indexOf(dragId);
        const toIndex = ids.indexOf(dropId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
          return;
        }

        setValue("scopes", reorderScopes(scopes, fromIndex, toIndex), {
          shouldDirty: true,
        });
        return;
      }

      if (dragKey.startsWith("zone:") && dropKey.startsWith("zone:")) {
        const dragId = dragKey.replace(/^zone:/, "");
        const dropId = dropKey.replace(/^zone:/, "");
        if (!siblingZoneIds(scopesValues, dragId).includes(dropId)) {
          return;
        }

        applyScopes(reorderZoneSiblings(scopesValues, dragId, dropId));
      }
    },
    [applyScopes, scopes, scopesValues, setValue],
  );

  const titleRender = useCallback(
    (node: SiteScopesAntdTreeNode) => {
      const depth = node.depth ?? 0;
      const nodeKey = String(node.key);

      if (node.rowKind === "scope") {
        const scopeId = nodeKey.replace(/^scope:/, "");
        const rhfIndex = (watchedScopes ?? []).findIndex((row) => row.id === scopeId);
        const scope = rhfIndex >= 0 ? (watchedScopes ?? [])[rhfIndex] : undefined;
        const rowKey = `scope:${scopeId}`;

        if (!scope || rhfIndex < 0) {
          return null;
        }

        return (
          <ScopesNameRow
            depth={depth}
            deleteLabel="Remove scope"
            deleteDisabled={disabled || !writableScopes}
            onDelete={scope.can_delete ? () => removeScopeById(scopeId) : undefined}
          >
            <Controller<SiteScopesFormValues>
              name={`scopes.${rhfIndex}.name`}
              render={({ field: { value, onChange, onBlur } }) => (
                <ScopesNameInput
                  rowKey={rowKey}
                  value={String(value ?? "")}
                  readOnlyLabel={formatScopeInstanceLabel(
                    String(value ?? ""),
                    scope.root_item_name,
                  )}
                  disabled={disabled || !writableScopes}
                  emphasis
                  placeholder="Scope name"
                  editingKey={editingKey}
                  setEditingKey={setEditingKey}
                  focusEditKeyRef={focusEditKeyRef}
                  onSelectRow={() => selectRow(rowKey)}
                  onChange={onChange}
                  onBlur={onBlur}
                />
              )}
            />
          </ScopesNameRow>
        );
      }

      const zoneId = node.zoneId;
      if (!zoneId) {
        return null;
      }

      const zone = getZoneById(scopesValues, zoneId);
      const rowKey = `zone:${zoneId}`;

      return (
        <ScopesNameRow
          depth={depth}
          deleteLabel="Remove zone"
          deleteDisabled={disabled || !writableScopes || zone?.can_delete === false}
          onDelete={() => removeZone(zoneId)}
        >
          <ScopesNameInput
            rowKey={rowKey}
            value={zone?.name ?? ""}
            disabled={disabled || !writableScopes}
            placeholder="Zone name"
            editingKey={editingKey}
            setEditingKey={setEditingKey}
            focusEditKeyRef={focusEditKeyRef}
            onSelectRow={() => selectRow(rowKey)}
            onChange={(nextValue) => onZoneFieldChange(zoneId, { name: nextValue })}
          />
        </ScopesNameRow>
      );
    },
    [
      disabled,
      editingKey,
      onZoneFieldChange,
      removeScopeById,
      removeZone,
      scopesValues,
      selectRow,
      watchedScopes,
      writableScopes,
      writableScopes,
    ],
  );

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Optional. Each scope is an instance of a catalog scope root (top-level item). Add
        zones underneath for geography on this site.
      </Typography.Paragraph>

      {writable ? (
        <Space style={{ marginBottom: 12 }}>
          {writableScopes ? (
            <Dropdown
              menu={addScopeMenu}
              disabled={disabled || rootPickerLoading || !hasScopeRoots}
            >
              <Button type="primary" icon={<PlusOutlined />}>
                Add scope <DownOutlined />
              </Button>
            </Dropdown>
          ) : null}
          {writableScopes ? (
            <Button icon={<PlusOutlined />} disabled={disabled || !canAddZone} onClick={handleAddZone}>
              Add zone
            </Button>
          ) : null}
        </Space>
      ) : null}

      {writableScopes && !rootPickerLoading && !hasScopeRoots ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          No scope roots in Items — add top-level items there before adding scopes.
        </Typography.Paragraph>
      ) : null}

      <Tree<SiteScopesAntdTreeNode>
        virtual={false}
        defaultExpandAll
        treeData={treeData}
        selectedKeys={selectedKeys}
        onSelect={(keys) => setSelectedKeys(keys.map(String))}
        titleRender={titleRender}
        draggable={writable && !disabled ? { icon: false } : false}
        allowDrop={allowDrop}
        onDrop={onDrop}
        style={{ background: "transparent" }}
        styles={{
          root: { background: "transparent", width: "fit-content", maxWidth: "100%" },
          item: { background: "transparent" },
        }}
      />
    </div>
  );
};
