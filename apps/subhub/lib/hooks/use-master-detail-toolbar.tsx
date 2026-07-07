"use client";

import { surfaceAllows } from "@latch/contracts";
import type { Manifest } from "@latch/contracts";
import type { SurfaceId } from "@latch/contracts";
import {
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useMasterDetailSelectionOptional } from "@/components/shell/MasterDetailSelectionContext";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import type { ToolbarAction } from "@/components/shell/SurfaceToolbar";
import { useSurfaceFormChromeRegistration } from "@/components/surface/SurfaceFormChromeContext";
import { resolveChildParentId } from "@/lib/surfaces/resolve-child-parent-id";
import { buildCreateUrl, currentReturnTo } from "@/lib/surface-navigation";

export type CreateConfig =
  | { variant: "button" }
  | {
      variant: "dropdown";
      trigger?: "click" | "hover";
      items: Array<{
        key: string;
        label: string;
        href: string;
        disabled?: boolean;
      }>;
    }
  | { variant: "item"; trigger?: "click" | "hover" };

export type MasterDetailSurfaceConfig = {
  listRoute: string;
  newPath: string;
  detailSurfaceId: SurfaceId;
  createGate: "write" | "create";
  /** Manifest surface for gating **New** (default: `detailSurfaceId`). Categories use `item_list`. */
  createManifestSurfaceId?: SurfaceId;
  create?: CreateConfig;
};

type RouteMode = "idle" | "create" | "edit";

const parseEntityId = (
  pathname: string,
  config: MasterDetailSurfaceConfig,
): string | null => {
  if (pathname === config.listRoute || pathname === config.newPath) {
    return null;
  }

  const prefix = `${config.listRoute}/`;
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const id = pathname.slice(prefix.length);
  return id.length > 0 ? id : null;
};

const resolveRouteMode = (
  pathname: string,
  config: MasterDetailSurfaceConfig,
): RouteMode => {
  if (pathname === config.listRoute) {
    return "idle";
  }

  if (pathname === config.newPath) {
    return "create";
  }

  if (parseEntityId(pathname, config)) {
    return "edit";
  }

  return "idle";
};

const canCreate = (manifest: Manifest, gate: MasterDetailSurfaceConfig["createGate"]) =>
  surfaceAllows(manifest, gate);

/** Create may be authorized on a list Surface while edit chrome uses detail — skip duplicate toolbar gate. */
const newToolbarSurfaceAction = (
  config: MasterDetailSurfaceConfig,
): MasterDetailSurfaceConfig["createGate"] | undefined =>
  config.createManifestSurfaceId ? undefined : config.createGate;

export const useMasterDetailToolbar = (
  createManifest: Manifest,
  config: MasterDetailSurfaceConfig,
): void => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chrome = useSurfaceFormChromeRegistration();
  const selection = useMasterDetailSelectionOptional();

  const routeMode = resolveRouteMode(pathname, config);
  const entityId = parseEntityId(pathname, config);
  const toolbarManifest = chrome?.manifest ?? createManifest;

  const childParentIdForRender = resolveChildParentId({
    selectionId: selection?.selectedId ?? null,
    entityId,
    config,
  });
  const childCreateBlocked = selection?.childCreateBlocked ?? false;

  const onNew = useCallback(() => {
    const href = buildCreateUrl({
      newPath: config.newPath,
      returnTo: currentReturnTo(pathname, searchParams),
      fallbackList: config.listRoute,
    });
    router.push(href);
  }, [config.listRoute, config.newPath, pathname, router, searchParams]);

  const newDisabled = Boolean(chrome?.isDirty);

  const actions = useMemo((): ToolbarAction[] => {
    const items: ToolbarAction[] = [];

    if (routeMode === "idle" || routeMode === "edit") {
      const createConfig = config.create ?? { variant: "button" as const };
      const returnTo = currentReturnTo(pathname, searchParams);

      if (createConfig.variant === "item" && canCreate(createManifest, config.createGate)) {
        items.push({
          variant: "dropdown",
          key: "new",
          label: "New",
          icon: <PlusOutlined />,
          priority: "secondary",
          surfaceAction: newToolbarSurfaceAction(config),
          trigger: createConfig.trigger ?? "click",
          disabled: newDisabled,
          menu: [
            {
              key: "new-root",
              label: "New root",
              onClick: () =>
                router.push(
                  buildCreateUrl({
                    newPath: config.newPath,
                    returnTo,
                    fallbackList: config.listRoute,
                  }),
                ),
            },
            {
              key: "new-child",
              label: "New child",
              disabled: !childParentIdForRender || childCreateBlocked,
              onClick: () => {
                const parentId = resolveChildParentId({
                  selectionId: selection?.selectionRef.current ?? null,
                  entityId,
                  config,
                });
                if (!parentId) {
                  return;
                }
                router.push(
                  buildCreateUrl({
                    newPath: config.newPath,
                    returnTo,
                    fallbackList: config.listRoute,
                    params: { parent_id: parentId },
                  }),
                );
              },
            },
          ],
        });
      } else if (
        createConfig.variant === "dropdown" &&
        canCreate(createManifest, config.createGate)
      ) {
        items.push({
          variant: "dropdown",
          key: "new",
          label: "New",
          icon: <PlusOutlined />,
          priority: "secondary",
          surfaceAction: newToolbarSurfaceAction(config),
          trigger: createConfig.trigger ?? "click",
          disabled: newDisabled,
          menu: createConfig.items.map((item) => ({
            key: item.key,
            label: item.label,
            disabled: item.disabled,
            onClick: () => router.push(item.href),
          })),
        });
      } else if (canCreate(createManifest, config.createGate)) {
        items.push({
          key: "new",
          label: "New",
          icon: <PlusOutlined />,
          priority: "secondary",
          surfaceAction: newToolbarSurfaceAction(config),
          disabled: newDisabled,
          onClick: onNew,
        });
      }
    }

    if (routeMode === "create" || routeMode === "edit") {
      const canSave = chrome?.canSave ?? false;
      const saving = chrome?.saving ?? false;
      const isDirty = chrome?.isDirty ?? false;

      if (routeMode === "create") {
        const saveMenu = [
          {
            key: "save",
            label: "Save",
            onClick: () => chrome?.onSave(),
          },
          ...(chrome?.onSaveAndNew
            ? [
                {
                  key: "save-and-new",
                  label: "Save and New",
                  onClick: () => chrome.onSaveAndNew?.(),
                },
              ]
            : []),
        ];

        if (chrome?.onSaveAndNew) {
          items.push({
            variant: "dropdown",
            key: "save",
            label: "Save",
            icon: <SaveOutlined />,
            priority: "primary",
            surfaceAction: "write",
            trigger: "hover",
            disabled: !canSave,
            loading: saving,
            menu: saveMenu,
          });
        } else {
          items.push({
            key: "save",
            label: "Save",
            icon: <SaveOutlined />,
            priority: "primary",
            surfaceAction: "write",
            disabled: !canSave,
            loading: saving,
            onClick: () => chrome?.onSave(),
          });
        }

        items.push({
          key: "cancel",
          label: "Cancel",
          icon: <CloseOutlined />,
          priority: "secondary",
          surfaceAction: "write",
          disabled: saving,
          onClick: () => chrome?.onCancel?.(),
        });
      } else {
        items.push({
          key: "save",
          label: "Save",
          icon: <SaveOutlined />,
          priority: "primary",
          surfaceAction: "write",
          disabled: !canSave || !isDirty,
          loading: saving,
          onClick: () => chrome?.onSave(),
        });

        if (chrome?.onRevert) {
          items.push({
            key: "revert",
            label: "Revert",
            icon: <UndoOutlined />,
            priority: "secondary",
            surfaceAction: "write",
            disabled: !isDirty || saving,
            onClick: () => chrome.onRevert?.(),
          });
        }

        items.push({
          key: "delete",
          label: "Delete",
          icon: <DeleteOutlined />,
          priority: "secondary",
          surfaceAction: "delete",
          danger: true,
          disabled: !chrome || chrome.canDelete === false,
          loading: chrome?.saving ?? false,
          onClick: () => chrome?.onDelete?.(),
        });
      }
    }

    return items;
  }, [
    childCreateBlocked,
    childParentIdForRender,
    chrome,
    config,
    createManifest,
    entityId,
    newDisabled,
    onNew,
    pathname,
    routeMode,
    router,
    searchParams,
    selection,
  ]);

  useRegisterSurfaceActions(toolbarManifest, actions);
};
