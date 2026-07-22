import type { DataNode } from "antd/es/tree";
import { describe, expect, it } from "vitest";

import type { ItemTreeNode } from "@/lib/catalog/descriptors/item-list";

import {
  allowItemDrop,
  applyDropToTree,
  findNodeById,
  isDescendantOf,
  resolveDropPatch,
  resolveScopeRootId,
} from "./item-tree-dnd";

const sampleTree: ItemTreeNode[] = [
  {
    id: "root-fa",
    name: "Fire Alarm",
    parent_id: null,
    node_type: "scope",
    sort_order: 1,
    is_root: true,
    freight_rate_type_id: null,
    incidental_rate_type_id: null,
    markup_type_id: null,
    material_phase_id: null,
    children: [
      {
        id: "cat-init",
        name: "Initiating",
        parent_id: "root-fa",
        node_type: "category",
        sort_order: 1,
        is_root: false,
        freight_rate_type_id: null,
        incidental_rate_type_id: null,
        markup_type_id: null,
        material_phase_id: null,
        children: [],
      },
      {
        id: "cat-wire",
        name: "Wire",
        parent_id: "root-fa",
        node_type: "category",
        sort_order: 2,
        is_root: false,
        freight_rate_type_id: null,
        incidental_rate_type_id: null,
        markup_type_id: null,
        material_phase_id: null,
        children: [
          {
            id: "leaf-fplr",
            name: "FPLR",
            parent_id: "cat-wire",
            node_type: "item",
            sort_order: 1,
            is_root: false,
            freight_rate_type_id: null,
            incidental_rate_type_id: null,
            markup_type_id: null,
            material_phase_id: null,
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "root-intrusion",
    name: "Intrusion",
    parent_id: null,
    node_type: "scope",
    sort_order: 2,
    is_root: true,
    freight_rate_type_id: null,
    incidental_rate_type_id: null,
    markup_type_id: null,
    material_phase_id: null,
    children: [],
  },
];

const dropInfo = (
  dragId: string,
  dropId: string,
  dropPosition: number,
  dropToGap: boolean,
) => ({
  dragNode: { key: dragId } as DataNode,
  node: { key: dropId } as DataNode,
  dropNode: { key: dropId } as DataNode,
  dropPosition,
  dropToGap,
});

describe("findNodeById", () => {
  it("finds nested nodes", () => {
    expect(findNodeById(sampleTree, "leaf-fplr")?.name).toBe("FPLR");
  });
});

describe("resolveScopeRootId", () => {
  it("walks to the scope root", () => {
    expect(resolveScopeRootId(sampleTree, "leaf-fplr")).toBe("root-fa");
  });
});

describe("isDescendantOf", () => {
  it("detects descendants", () => {
    expect(isDescendantOf(sampleTree, "cat-wire", "leaf-fplr")).toBe(true);
    expect(isDescendantOf(sampleTree, "root-fa", "cat-init")).toBe(true);
    expect(isDescendantOf(sampleTree, "cat-init", "leaf-fplr")).toBe(false);
  });
});

describe("allowItemDrop", () => {
  it("allows reorder among siblings", () => {
    expect(
      allowItemDrop(dropInfo("cat-init", "cat-wire", 1, true), sampleTree),
    ).toBe(true);
  });

  it("allows reparent onto category", () => {
    expect(
      allowItemDrop(dropInfo("leaf-fplr", "cat-init", 0, false), sampleTree),
    ).toBe(true);
  });

  it("blocks drop onto quotable item", () => {
    expect(
      allowItemDrop(dropInfo("cat-init", "leaf-fplr", 0, false), sampleTree),
    ).toBe(false);
  });

  it("blocks cross-root moves", () => {
    expect(
      allowItemDrop(dropInfo("cat-init", "root-intrusion", 1, true), sampleTree),
    ).toBe(false);
  });

  it("blocks cycle moves", () => {
    expect(
      allowItemDrop(dropInfo("cat-wire", "leaf-fplr", 0, false), sampleTree),
    ).toBe(false);
  });

  it("allows gap drop on scope root to reparent nested category", () => {
    const tree: ItemTreeNode[] = [
      {
        ...sampleTree[0]!,
        children: [
          {
            id: "cat-init",
            name: "Initiating",
            parent_id: "root-fa",
            node_type: "category",
            sort_order: 1,
            is_root: false,
            freight_rate_type_id: null,
            incidental_rate_type_id: null,
            markup_type_id: null,
            material_phase_id: null,
            children: [
              {
                id: "cat-nested",
                name: "Nested",
                parent_id: "cat-init",
                node_type: "category",
                sort_order: 1,
                is_root: false,
                freight_rate_type_id: null,
                incidental_rate_type_id: null,
                markup_type_id: null,
                material_phase_id: null,
                children: [],
              },
            ],
          },
          sampleTree[0]!.children[1]!,
        ],
      },
      sampleTree[1]!,
    ];

    expect(
      allowItemDrop(dropInfo("cat-nested", "root-fa", 1, false), tree),
    ).toBe(true);
  });

  it("allows scope root gap reorder only", () => {
    expect(
      allowItemDrop(dropInfo("root-fa", "root-intrusion", 1, true), sampleTree),
    ).toBe(true);
    expect(
      allowItemDrop(dropInfo("root-fa", "cat-init", 0, false), sampleTree),
    ).toBe(false);
  });
});

describe("resolveDropPatch", () => {
  it("returns sibling reorder patch", () => {
    const patch = resolveDropPatch(
      dropInfo("cat-wire", "cat-init", -1, true),
      sampleTree,
    );

    expect(patch).toMatchObject({
      id: "cat-wire",
      parent_id: "root-fa",
      sort_order: 1,
      successMessage: 'Reordered "Wire"',
    });
  });

  it("returns sibling reorder patch when antd sends dropToGap false but dropPosition nonzero", () => {
    const patch = resolveDropPatch(
      dropInfo("cat-wire", "cat-init", 1, false),
      sampleTree,
    );

    expect(patch).toMatchObject({
      id: "cat-wire",
      parent_id: "root-fa",
      sort_order: 2,
      successMessage: 'Reordered "Wire"',
    });
  });

  it("reparents nested category onto scope via antd gap-on-scope drop", () => {
    const tree: ItemTreeNode[] = [
      {
        ...sampleTree[0]!,
        children: [
          {
            id: "cat-init",
            name: "Initiating",
            parent_id: "root-fa",
            node_type: "category",
            sort_order: 1,
            is_root: false,
            freight_rate_type_id: null,
            incidental_rate_type_id: null,
            markup_type_id: null,
            material_phase_id: null,
            children: [
              {
                id: "cat-nested",
                name: "Nested",
                parent_id: "cat-init",
                node_type: "category",
                sort_order: 1,
                is_root: false,
                freight_rate_type_id: null,
                incidental_rate_type_id: null,
                markup_type_id: null,
                material_phase_id: null,
                children: [],
              },
            ],
          },
          sampleTree[0]!.children[1]!,
        ],
      },
      sampleTree[1]!,
    ];

    const patch = resolveDropPatch(dropInfo("cat-nested", "root-fa", 1, false), tree);

    expect(patch).toMatchObject({
      id: "cat-nested",
      parent_id: "root-fa",
      sort_order: 3,
      successMessage: 'Moved "Nested" under "Fire Alarm"',
    });
  });

  it("reparents quotable leaf onto scope via gap drop on scope", () => {
    const patch = resolveDropPatch(dropInfo("leaf-fplr", "root-fa", 1, false), sampleTree);

    expect(patch).toMatchObject({
      id: "leaf-fplr",
      parent_id: "root-fa",
      sort_order: 3,
      successMessage: 'Moved "FPLR" under "Fire Alarm"',
    });
  });

  it("reparents across branches via gap drop on cousin category", () => {
    const tree: ItemTreeNode[] = [
      {
        ...sampleTree[0]!,
        children: [
          {
            id: "cat-init",
            name: "Initiating",
            parent_id: "root-fa",
            node_type: "category",
            sort_order: 1,
            is_root: false,
            freight_rate_type_id: null,
            incidental_rate_type_id: null,
            markup_type_id: null,
            material_phase_id: null,
            children: [
              {
                id: "cat-nested",
                name: "Nested",
                parent_id: "cat-init",
                node_type: "category",
                sort_order: 1,
                is_root: false,
                freight_rate_type_id: null,
                incidental_rate_type_id: null,
                markup_type_id: null,
                material_phase_id: null,
                children: [],
              },
            ],
          },
          sampleTree[0]!.children[1]!,
        ],
      },
      sampleTree[1]!,
    ];

    const patch = resolveDropPatch(dropInfo("cat-nested", "cat-wire", 1, false), tree);

    expect(patch).toMatchObject({
      id: "cat-nested",
      parent_id: "root-fa",
      sort_order: 3,
      successMessage: 'Moved "Nested" under "Fire Alarm"',
    });
  });

  it("reparents quotable leaf onto category via antd gap drop on category", () => {
    const patch = resolveDropPatch(dropInfo("leaf-fplr", "cat-init", 4, false), sampleTree);

    expect(patch).toMatchObject({
      id: "leaf-fplr",
      parent_id: "cat-init",
      sort_order: 1,
      successMessage: 'Moved "FPLR" under "Initiating"',
    });
  });

  it("returns reparent patch onto category", () => {
    const patch = resolveDropPatch(
      dropInfo("leaf-fplr", "cat-init", 0, false),
      sampleTree,
    );

    expect(patch).toMatchObject({
      id: "leaf-fplr",
      parent_id: "cat-init",
      sort_order: 1,
      successMessage: 'Moved "FPLR" under "Initiating"',
    });
  });
});

describe("applyDropToTree", () => {
  it("moves nodes optimistically", () => {
    const next = applyDropToTree(
      sampleTree,
      dropInfo("cat-wire", "cat-init", -1, true),
    );

    expect(next[0]?.children.map((node) => node.id)).toEqual([
      "cat-wire",
      "cat-init",
    ]);
  });
});
