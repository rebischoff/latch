import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { assertParentItemExists, assertParentNotQuotable, assertReparentAllowed } from "./item-write";
import { nestItemTree, resolveRootItemId } from "./item-tree";
import { assertSpecDefsBelongToRoot } from "./item-spec-participation-write";
import { assertRootSpecDefinitionsPatch } from "./spec-def-write";

const flatItem = (
  id: string,
  name: string,
  parent_id: string | null,
  sort_order: number,
  node_type: "scope" | "category" | "item" = parent_id === null ? "scope" : "category",
) => ({
  id,
  name,
  parent_id,
  node_type,
  sort_order,
  csi_code: null,
  freight_rate_type_id: null,
  incidental_rate_type_id: null,
  markup_type_id: null,
});

describe("nestItemTree", () => {
  it("nests siblings by sort_order then name", () => {
    const tree = nestItemTree(
      [
        flatItem("root-b", "Intrusion", null, 2),
        flatItem("root-a", "Fire Alarm", null, 1),
        flatItem("child", "Initiating", "root-a", 1),
      ],
      null,
    );

    expect(tree.map((node) => node.id)).toEqual(["root-a", "root-b"]);
    expect(tree[0]?.children[0]?.id).toBe("child");
  });
});

describe("resolveRootItemId", () => {
  it("walks ancestors to the scope root", () => {
    const rows = [
      flatItem("root", "Fire Alarm", null, 1),
      flatItem("child", "Wire", "root", 1),
      flatItem("leaf", "FPLR", "child", 1),
    ];

    expect(resolveRootItemId(rows, "leaf")).toBe("root");
  });
});

describe("assertParentItemExists", () => {
  it("rejects unknown parent_id", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as PoolClient;

    await expect(assertParentItemExists(client, "missing")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("assertRootSpecDefinitionsPatch", () => {
  it("rejects spec_definitions on nested nodes", () => {
    expect(() => assertRootSpecDefinitionsPatch(false)).toThrow(ValidationError);
  });
});

describe("assertSpecDefsBelongToRoot", () => {
  it("rejects spec_def_id from another root namespace", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ id: "def-1" }] }),
    } as unknown as PoolClient;

    await expect(
      assertSpecDefsBelongToRoot(client, "root-a", ["def-1", "def-2"]),
    ).rejects.toMatchObject({
      details: {
        field: "spec_participation",
        code: "wrong_root_namespace",
      },
    });
  });
});

const mockGuardClient = (handlers: Record<string, unknown>) =>
  ({
    query: vi.fn(async (sql: string) => {
      if (String(sql).includes("SELECT node_type FROM item WHERE id")) {
        return { rows: handlers.nodeType ? [{ node_type: handlers.nodeType }] : [] };
      }
      if (String(sql).includes("SELECT id, parent_id FROM item")) {
        return { rows: handlers.allItems ?? [] };
      }
      return { rows: [] };
    }),
  }) as unknown as PoolClient;

describe("assertParentNotQuotable", () => {
  it("rejects child insert under quotable item", async () => {
    const client = mockGuardClient({ nodeType: "item" });
    await expect(assertParentNotQuotable(client, "leaf-1")).rejects.toMatchObject({
      details: { code: "parent_not_selectable" },
    });
  });
});

describe("assertReparentAllowed", () => {
  it("rejects cross-root move", async () => {
    const client = mockGuardClient({
      allItems: [
        { id: "root-a", parent_id: null },
        { id: "root-b", parent_id: null },
        { id: "leaf", parent_id: "root-a" },
      ],
    });

    await expect(assertReparentAllowed(client, "leaf", "root-b")).rejects.toMatchObject({
      details: { code: "cross_root_move" },
    });
  });

  it("rejects cycle move", async () => {
    const client = mockGuardClient({
      allItems: [
        { id: "root", parent_id: null },
        { id: "branch", parent_id: "root" },
        { id: "leaf", parent_id: "branch" },
      ],
    });

    await expect(assertReparentAllowed(client, "branch", "leaf")).rejects.toMatchObject({
      details: { code: "cycle_move" },
    });
  });

  it("allows same-root reparent", async () => {
    const client = mockGuardClient({
      allItems: [
        { id: "root", parent_id: null },
        { id: "branch-a", parent_id: "root" },
        { id: "branch-b", parent_id: "root" },
        { id: "leaf", parent_id: "branch-a" },
      ],
    });

    await expect(
      assertReparentAllowed(client, "leaf", "branch-b"),
    ).resolves.toBeUndefined();
  });
});
