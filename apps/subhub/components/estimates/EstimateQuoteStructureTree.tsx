"use client";

import { Tree, Typography } from "antd";
import type { TreeProps } from "antd";
import { useMemo } from "react";

import {
  buildEstimateScopeTree,
  toAntdScopeTreeData,
  type EstimateScopeAntdTreeNode,
} from "@/components/estimates/estimate-scope-tree";
import type { EstimateSiteTreeFormRow } from "@/components/estimates/estimate-line-tree";
import {
  selectionToTreeKey,
  type EstimateBucketSelection,
} from "@/components/estimates/estimate-line-selection";

type EstimateQuoteStructureTreeProps = {
  selection: EstimateBucketSelection | null;
  siteTree: EstimateSiteTreeFormRow | null;
  onSelect: (selection: EstimateBucketSelection | null) => void;
};

export const EstimateQuoteStructureTree = ({
  selection,
  siteTree,
  onSelect,
}: EstimateQuoteStructureTreeProps) => {
  const treeData = useMemo(
    () => toAntdScopeTreeData(buildEstimateScopeTree(siteTree)),
    [siteTree],
  );

  const selectedKeys = selection ? [selectionToTreeKey(selection)] : [];

  const onSelectTree: TreeProps<EstimateScopeAntdTreeNode>["onSelect"] = (keys, info) => {
    const key = String(keys[0] ?? info.node.key);
    if (!key) {
      onSelect(null);
      return;
    }

    if (key.startsWith("scope:")) {
      onSelect({ siteScopeId: key.replace(/^scope:/, ""), siteZoneId: null });
      return;
    }

    if (key.startsWith("zone:")) {
      const [, siteScopeId, siteZoneId] = key.split(":");
      if (siteScopeId && siteZoneId) {
        onSelect({ siteScopeId, siteZoneId });
      }
    }
  };

  return (
    <div>
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
        Scopes &amp; zones
      </Typography.Text>
      <Tree<EstimateScopeAntdTreeNode>
        treeData={treeData}
        selectedKeys={selectedKeys}
        onSelect={onSelectTree}
        defaultExpandAll
        blockNode
        showLine
      />
    </div>
  );
};
