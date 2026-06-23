import type { SelectProps, TreeSelectProps } from "antd";

export const findSelectLabel = (
  options: SelectProps["options"] | undefined,
  value: string | null | undefined,
): string => {
  if (!value) {
    return "—";
  }
  const match = options?.find((option) => option?.value === value);
  return typeof match?.label === "string" ? match.label : value;
};

export const findTreeTitle = (
  treeData: TreeSelectProps["treeData"],
  value: string | null | undefined,
): string => {
  if (!value) {
    return "—";
  }

  const walk = (
    nodes: TreeSelectProps["treeData"],
  ): string | undefined => {
    for (const node of nodes ?? []) {
      if (node?.value === value) {
        return typeof node.title === "string" ? node.title : value;
      }
      const childMatch = walk(node?.children);
      if (childMatch) {
        return childMatch;
      }
    }
    return undefined;
  };

  return walk(treeData) ?? value;
};
