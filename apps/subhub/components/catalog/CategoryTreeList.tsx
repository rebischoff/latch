"use client";

import type { DataNode } from "antd/es/tree";
import { Badge, Input, Tree, Typography } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

import { useMasterDetailSelection } from "@/components/shell/MasterDetailSelectionContext";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { useSurfaceListSearch } from "@/lib/hooks/use-surface-list-search";
import { routes } from "@/lib/nav-routes";

type CategoryTreeNode = {
  children: CategoryTreeNode[];
  id: string;
  is_root: boolean;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

const toAntdTreeData = (nodes: CategoryTreeNode[]): DataNode[] =>
  nodes.map((node) => ({
    key: node.id,
    title: (
      <span>
        {node.name}
        {node.is_root ? (
          <Badge count="root" style={{ marginLeft: 8, backgroundColor: "#1677ff" }} />
        ) : null}
      </span>
    ),
    children: toAntdTreeData(node.children),
  }));

const findNodeById = (
  nodes: CategoryTreeNode[],
  id: string,
): CategoryTreeNode | undefined => {
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

export const CategoryTreeList = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedId, setSelectedId } = useMasterDetailSelection();

  const baseList = useSurfaceList("category_list");
  const { search, setSearch, showSearch, listQuery } = useSurfaceListSearch(
    baseList.data?.manifest,
    "tree",
  );
  const searchList = useSurfaceList("category_list", listQuery);
  const active = listQuery ? searchList : baseList;

  const tree = useMemo(() => {
    const row = active.data?.data.rows[0] as { tree?: CategoryTreeNode[] } | undefined;
    return row?.tree ?? [];
  }, [active.data?.data.rows]);

  const selectedFromRoute = useMemo(() => {
    const match = pathname.match(/^\/categories\/([^/]+)$/);
    return match?.[1] && match[1] !== "new" ? match[1] : null;
  }, [pathname]);

  const activeSelection = selectedId ?? selectedFromRoute;

  if (active.error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load categories.</Typography.Text>
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
          <Typography.Text type="secondary">Loading categories…</Typography.Text>
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
              setSelectedId(id);
              router.push(routes.categories.detail(id));
            }}
          />
        )}
      </div>
    </div>
  );
};

// exported for tests
export { findNodeById };
