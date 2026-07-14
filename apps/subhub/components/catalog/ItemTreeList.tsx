"use client";

import { fieldAllows } from "@latch/contracts";
import type { DataNode } from "antd/es/tree";
import { App, Badge, Input, Tree, Typography } from "antd";
import type { TreeProps } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useMasterDetailSelection } from "@/components/shell/MasterDetailSelectionContext";
import type { ItemTreeNode } from "@/lib/catalog/descriptors/item-list";
import {
  allowItemDrop,
  applyDropToTree,
  dropFailureMessage,
  findNodeById,
  resolveDropPatch,
  type ItemDropInfo,
} from "@/lib/catalog/item-tree-dnd";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { surfaceDetailKey, surfaceListKey } from "@/lib/hooks/surface-query-keys";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { useSurfaceListSearch } from "@/lib/hooks/use-surface-list-search";
import { routes } from "@/lib/nav-routes";
import { patchSurfaceDetail, SurfaceApiError } from "@/lib/surface-api";
import { buildDetailHref } from "@/lib/surface-navigation";

const toAntdTreeData = (nodes: ItemTreeNode[]): DataNode[] =>
  nodes.map((node) => ({
    key: node.id,
    title: (
      <span style={node.node_type === "scope" ? { fontWeight: 600 } : undefined}>
        {node.name}
        {node.node_type === "item" ? (
          <Badge status="default" style={{ marginLeft: 8 }} />
        ) : null}
      </span>
    ),
    children: toAntdTreeData(node.children),
  }));

export const ItemTreeList = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { selectedId, setSelectedId, setChildCreateBlocked } = useMasterDetailSelection();

  const baseList = useSurfaceList("item_list");
  const { search, setSearch, showSearch, listQuery } = useSurfaceListSearch(
    baseList.data?.manifest,
    "tree",
  );
  const searchList = useSurfaceList("item_list", listQuery);
  const active = listQuery ? searchList : baseList;

  const tree = useMemo(() => {
    const row = active.data?.data.rows[0] as { tree?: ItemTreeNode[] } | undefined;
    return row?.tree ?? [];
  }, [active.data?.data.rows]);

  const [displayTree, setDisplayTree] = useState<ItemTreeNode[]>([]);

  useEffect(() => {
    setDisplayTree(tree);
  }, [tree]);

  const selectedFromRoute = useMemo(() => {
    const match = pathname.match(/^\/items\/([^/]+)$/);
    return match?.[1] && match[1] !== "new" ? match[1] : null;
  }, [pathname]);

  const activeSelection = selectedId ?? selectedFromRoute;
  const manifestProbeId = activeSelection ?? displayTree[0]?.id;
  const { data: detailForManifest } = useSurfaceDetail("item_detail", manifestProbeId);
  const writable = detailForManifest?.manifest
    ? fieldAllows(detailForManifest.manifest, "profile", "write")
    : false;
  const searchActive = Boolean(listQuery);

  const handleDrop = useCallback(
    async (info: ItemDropInfo) => {
      const patch = resolveDropPatch(info, displayTree);
      if (!patch) {
        return;
      }

      const previousTree = displayTree;
      setDisplayTree(applyDropToTree(displayTree, info));

      try {
        await patchSurfaceDetail("item_detail", patch.id, {
          profile: {
            parent_id: patch.parent_id,
            sort_order: patch.sort_order,
          },
        });
        message.success(patch.successMessage);
        await queryClient.invalidateQueries({ queryKey: surfaceListKey("item_list") });
        if (activeSelection === patch.id) {
          await queryClient.invalidateQueries({
            queryKey: surfaceDetailKey("item_detail", patch.id),
          });
        }
      } catch (error) {
        setDisplayTree(previousTree);
        const serverMessage =
          error instanceof SurfaceApiError ? error.message : undefined;
        message.error(dropFailureMessage(patch.draggedName, serverMessage));
      }
    },
    [activeSelection, displayTree, message, queryClient],
  );

  const handleAllowDrop = useCallback<NonNullable<TreeProps["allowDrop"]>>(
    (info) => allowItemDrop(info, displayTree),
    [displayTree],
  );

  if (active.error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load items.</Typography.Text>
      </div>
    );
  }

  return (
    <div>
      {showSearch ? (
        <div style={{ padding: "8px 8px 0" }}>
          <Input.Search
            allowClear
            placeholder="Filter by name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      ) : null}
      <div style={{ padding: 8 }}>
        {active.isLoading || active.isFetching ? (
          <Typography.Text type="secondary">Loading items…</Typography.Text>
        ) : displayTree.length === 0 ? (
          <Typography.Text type="secondary">No categories yet.</Typography.Text>
        ) : (
          <Tree
            blockNode
            showLine
            defaultExpandAll
            selectedKeys={activeSelection ? [activeSelection] : []}
            treeData={toAntdTreeData(displayTree)}
            draggable={writable && !searchActive ? { icon: false } : false}
            allowDrop={handleAllowDrop}
            onDrop={(info) => {
              void handleDrop(info);
            }}
            onSelect={(keys) => {
              const id = String(keys[0] ?? "");
              if (!id) {
                return;
              }
              const node = findNodeById(displayTree, id);
              setChildCreateBlocked(node?.node_type === "item");
              setSelectedId(id);
              router.push(
                buildDetailHref({
                  detailPath: routes.items.detail(id),
                  currentSearch: searchParams,
                }),
              );
            }}
          />
        )}
      </div>
    </div>
  );
};
