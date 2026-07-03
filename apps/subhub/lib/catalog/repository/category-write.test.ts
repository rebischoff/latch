import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  assertNestedProfileFields,
  assertParentCategoryExists,
} from "./category-write";
import { nestCategoryTree, resolveRootCategoryId } from "./category-tree";
import {
  assertRootSpecParticipationExcludes,
  assertSpecDefsBelongToRoot,
} from "./category-spec-participation-write";
import { assertRootSpecDefinitionsPatch } from "./spec-def-write";

describe("nestCategoryTree", () => {
  it("nests siblings by sort_order then name", () => {
    const tree = nestCategoryTree(
      [
        {
          id: "root-b",
          name: "Intrusion",
          parent_id: null,
          sort_order: 2,
          csi_code: null,
          default_phase_template_id: null,
        },
        {
          id: "root-a",
          name: "Fire Alarm",
          parent_id: null,
          sort_order: 1,
          csi_code: null,
          default_phase_template_id: null,
        },
        {
          id: "child",
          name: "Initiating",
          parent_id: "root-a",
          sort_order: 1,
          csi_code: null,
          default_phase_template_id: null,
        },
      ],
      null,
    );

    expect(tree.map((node) => node.id)).toEqual(["root-a", "root-b"]);
    expect(tree[0]?.children[0]?.id).toBe("child");
  });
});

describe("resolveRootCategoryId", () => {
  it("walks ancestors to the scope root", () => {
    const rows = [
      {
        id: "root",
        name: "Fire Alarm",
        parent_id: null,
        sort_order: 1,
        csi_code: null,
        default_phase_template_id: null,
      },
      {
        id: "child",
        name: "Wire",
        parent_id: "root",
        sort_order: 1,
        csi_code: null,
        default_phase_template_id: null,
      },
      {
        id: "leaf",
        name: "FPLR",
        parent_id: "child",
        sort_order: 1,
        csi_code: null,
        default_phase_template_id: null,
      },
    ];

    expect(resolveRootCategoryId(rows, "leaf")).toBe("root");
  });
});

describe("assertParentCategoryExists", () => {
  it("rejects unknown parent_id", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as PoolClient;

    await expect(assertParentCategoryExists(client, "missing")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("assertNestedProfileFields", () => {
  it("rejects default_phase_template_id on nested nodes", () => {
    expect(() =>
      assertNestedProfileFields(false, { default_phase_template_id: "phase-1" }),
    ).toThrow(ValidationError);
  });
});

describe("assertRootSpecDefinitionsPatch", () => {
  it("rejects spec_definitions on nested nodes", () => {
    expect(() => assertRootSpecDefinitionsPatch(false)).toThrow(ValidationError);
  });
});

describe("assertRootSpecParticipationExcludes", () => {
  it("rejects excludes on root nodes", () => {
    expect(() =>
      assertRootSpecParticipationExcludes(true, [{ spec_def_id: "def-1" }]),
    ).toThrow(ValidationError);
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
