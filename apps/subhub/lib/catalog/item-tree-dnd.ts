import type { DataNode } from "antd/es/tree";

import type { ItemTreeNode } from "@/lib/catalog/descriptors/item-list";

export type ItemDropInfo = {
  dragNode: DataNode;
  node: DataNode;
  dropPosition: number;
  dropToGap: boolean;
};

export type ItemDropAllowInfo = {
  dragNode: DataNode;
  dropNode: DataNode;
  dropPosition: number;
};

export type ItemDropPatch = {
  draggedName: string;
  id: string;
  parent_id: string | null;
  sort_order: number;
  successMessage: string;
};

export const findNodeById = (
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

export const resolveScopeRootId = (
  tree: ItemTreeNode[],
  nodeId: string,
): string | undefined => {
  let current = findNodeById(tree, nodeId);
  while (current) {
    if (current.parent_id === null) {
      return current.id;
    }
    current = findNodeById(tree, current.parent_id);
  }
  return undefined;
};

export const isDescendantOf = (
  tree: ItemTreeNode[],
  ancestorId: string,
  nodeId: string,
): boolean => {
  const ancestor = findNodeById(tree, ancestorId);
  if (!ancestor) {
    return false;
  }
  return findNodeById(ancestor.children, nodeId) !== undefined;
};

const getSiblings = (
  tree: ItemTreeNode[],
  parentId: string | null,
): ItemTreeNode[] => {
  if (parentId === null) {
    return tree;
  }
  return findNodeById(tree, parentId)?.children ?? [];
};

const isGapDrop = (dropPosition: number): boolean => dropPosition !== 0;

export const allowItemDrop = (
  info: ItemDropAllowInfo,
  tree: ItemTreeNode[],
): boolean => {
  const dragId = String(info.dragNode.key);
  const dropId = String(info.dropNode.key);

  const dragged = findNodeById(tree, dragId);
  const dropTarget = findNodeById(tree, dropId);
  if (!dragged || !dropTarget) {
    return false;
  }

  if (dragId === dropId || isDescendantOf(tree, dragId, dropId)) {
    return false;
  }

  if (dropTarget.node_type === "item") {
    return false;
  }

  const isGap = isGapDrop(info.dropPosition);

  if (dragged.node_type === "scope") {
    return isGap && dragged.parent_id === null && dropTarget.parent_id === null;
  }

  const dragRoot = resolveScopeRootId(tree, dragId);
  const dropRoot = resolveScopeRootId(tree, dropId);
  if (!dragRoot || !dropRoot || dragRoot !== dropRoot) {
    return false;
  }

  if (isGap) {
    if (dragged.parent_id === dropTarget.parent_id) {
      return true;
    }
    if (dragged.parent_id === dropTarget.id) {
      return true;
    }
    if (dropTarget.node_type === "scope" && dragRoot === dropTarget.id) {
      return true;
    }
    if (dragRoot === dropRoot) {
      return true;
    }
    return false;
  }

  return true;
};

const buildSuccessMessage = (
  tree: ItemTreeNode[],
  dragged: ItemTreeNode,
  dropTarget: ItemTreeNode,
  info: ItemDropInfo,
  newParentId: string | null,
): string => {
  if (info.dropPosition === 0) {
    return `Moved "${dragged.name}" under "${dropTarget.name}"`;
  }

  if (dragged.parent_id === newParentId) {
    return `Reordered "${dragged.name}"`;
  }

  const parent = newParentId ? findNodeById(tree, newParentId) : null;
  if (parent) {
    return `Moved "${dragged.name}" under "${parent.name}"`;
  }

  return `Reordered "${dragged.name}"`;
};

export const resolveDropPatch = (
  info: ItemDropInfo,
  tree: ItemTreeNode[],
): ItemDropPatch | null => {
  const dragId = String(info.dragNode.key);
  const dropId = String(info.node.key);

  const dragged = findNodeById(tree, dragId);
  const dropTarget = findNodeById(tree, dropId);
  if (!dragged || !dropTarget) {
    return null;
  }

  if (
    !allowItemDrop(
      { dragNode: info.dragNode, dropNode: info.node, dropPosition: info.dropPosition },
      tree,
    )
  ) {
    return null;
  }

  let newParentId: string | null;
  let insertIndex: number;

  const isGap = isGapDrop(info.dropPosition);

  if (isGap) {
    if (dragged.parent_id === dropTarget.id) {
      newParentId = dropTarget.id;
      const siblings = dropTarget.children.filter((node) => node.id !== dragId);
      insertIndex = info.dropPosition < 0 ? 0 : siblings.length;
    } else if (
      dropTarget.node_type === "scope" &&
      resolveScopeRootId(tree, dragId) === dropTarget.id
    ) {
      newParentId = dropTarget.id;
      const siblings = dropTarget.children.filter((node) => node.id !== dragId);
      insertIndex = info.dropPosition < 0 ? 0 : siblings.length;
    } else if (
      dropTarget.node_type === "category" &&
      dragged.node_type === "item" &&
      dragged.parent_id !== dropTarget.id
    ) {
      newParentId = dropTarget.id;
      const siblings = dropTarget.children.filter((node) => node.id !== dragId);
      insertIndex = info.dropPosition < 0 ? 0 : siblings.length;
    } else {
      newParentId = dropTarget.parent_id;
      const siblings = getSiblings(tree, newParentId).filter((node) => node.id !== dragId);
      const dropIndex = siblings.findIndex((node) => node.id === dropId);
      if (dropIndex < 0) {
        return null;
      }
      insertIndex = info.dropPosition < 0 ? dropIndex : dropIndex + 1;
    }
  } else {
    newParentId = dropId;
    const siblings = dropTarget.children.filter((node) => node.id !== dragId);
    insertIndex = siblings.length;
  }

  return {
    id: dragId,
    parent_id: newParentId,
    sort_order: insertIndex + 1,
    draggedName: dragged.name,
    successMessage: buildSuccessMessage(tree, dragged, dropTarget, info, newParentId),
  };
};

export const dropFailureMessage = (
  draggedName: string,
  serverMessage?: string,
): string => serverMessage ?? `Unable to move "${draggedName}"`;

const cloneTree = (nodes: ItemTreeNode[]): ItemTreeNode[] =>
  nodes.map((node) => ({
    ...node,
    children: cloneTree(node.children),
  }));

const removeNode = (
  nodes: ItemTreeNode[],
  id: string,
): { nodes: ItemTreeNode[]; removed?: ItemTreeNode } => {
  const next: ItemTreeNode[] = [];
  let removed: ItemTreeNode | undefined;

  for (const node of nodes) {
    if (node.id === id) {
      removed = node;
      continue;
    }

    const childResult = removeNode(node.children, id);
    if (childResult.removed) {
      removed = childResult.removed;
      next.push({ ...node, children: childResult.nodes });
    } else {
      next.push(node);
    }
  }

  return { nodes: next, removed };
};

const insertNode = (
  nodes: ItemTreeNode[],
  parentId: string | null,
  node: ItemTreeNode,
  index: number,
): ItemTreeNode[] => {
  if (parentId === null) {
    const next = [...nodes];
    next.splice(index, 0, { ...node, parent_id: null, is_root: true });
    return next;
  }

  return nodes.map((current) => {
    if (current.id === parentId) {
      const children = [...current.children];
      children.splice(index, 0, {
        ...node,
        parent_id: parentId,
        is_root: false,
      });
      return { ...current, children };
    }

    return {
      ...current,
      children: insertNode(current.children, parentId, node, index),
    };
  });
};

export const applyDropToTree = (
  tree: ItemTreeNode[],
  info: ItemDropInfo,
): ItemTreeNode[] => {
  const patch = resolveDropPatch(info, tree);
  if (!patch) {
    return tree;
  }

  const { nodes, removed } = removeNode(cloneTree(tree), patch.id);
  if (!removed) {
    return tree;
  }

  const moved = {
    ...removed,
    parent_id: patch.parent_id,
    sort_order: patch.sort_order,
    is_root: patch.parent_id === null,
  };

  return insertNode(nodes, patch.parent_id, moved, patch.sort_order - 1);
};
