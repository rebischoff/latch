"use client";

import type { DataNode } from "antd/es/tree";
import { Badge, Input, Tree, Typography } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

import { useMasterDetailSelection } from "@/components/shell/MasterDetailSelectionContext";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { useSurfaceListSearch } from "@/lib/hooks/use-surface-list-search";
import { routes } from "@/lib/nav-routes";

type ItemTreeNode = {
  children: ItemTreeNode[];
  id: string;
  is_root: boolean;
  name: string;
  node_type: "scope" | "category" | "item";
  parent_id: string | null;
  sort_order: number;
};

const nodeTypeBadge = (nodeType: ItemTreeNode["node_type"]) => {
  if (nodeType === "scope") {
    return <Badge count="scope" style={{ marginLeft: 8, backgroundColor: "#1677ff" }} />;
  }
  if (nodeType === "item") {
    return <Badge count="leaf" style={{ marginLeft: 8, backgroundColor: "#52c41a" }} />;
  }
  return null;
};

const toAntdTreeData = (nodes: ItemTreeNode[]): DataNode[] =>
  nodes.map((node) => ({
    key: node.id,
    title: (
      <span>
        {node.name}
        {node.is_root ? (
          <Badge count="root" style={{ marginLeft: 8, backgroundColor: "#1677ff" }} />
        ) : null}
        {nodeTypeBadge(node.node_type)}
      </span>
    ),
    children: toAntdTreeData(node.children),
  }));

const findNodeById = (
  nodes: ItemTreeNode[],
  id: string,
): ItemTreeNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const child = findNodeById(node.children, id);
    if (child) {
      return child;
    }
  }
  return undefined;
};

export const ItemTreeList = () => {
  const pathname = usePathname();
  const router = useRouter();
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

  const selectedFromRoute = useMemo(() => {
    const match = pathname.match(/^\/items\/([^/]+)$/);
    return match?.[1] && match[1] !== "new" ? match[1] : null;
  }, [pathname]);

  const activeSelection = selectedId ?? selectedFromRoute;

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
        ) : tree.length === 0 ? (
          <Typography.Text type="secondary">No categories yet.</Typography.Text>
        ) : (
          <Tree
            showLine
            defaultExpandAll
            selectedKeys={activeSelection ? [activeSelection] : []}
            treeData={toAntdTreeData(tree)}
            onSelect={(keys) => {
              const id = String(keys[0] ?? "");
              if (!id) {
                return;
              }
              const node = findNodeById(tree, id);
              setChildCreateBlocked(node?.node_type === "item");
              setSelectedId(id);
              router.push(routes.items.detail(id));
            }}
          />
        )}
      </div>
    </div>
  );
};

// exported for tests
export { findNodeById };
