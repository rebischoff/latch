import { describe, expect, it } from "vitest";

import {
  collapsePartSpecRows,
  expandPartSpecsForPatch,
  mergePartSpecsWithDefs,
} from "./part-specs-form";

const defs = [
  {
    spec_def_id: "def-enum",
    code: "slc",
    display_name: "SLC protocol",
    value_type: "enum" as const,
    options: [
      { id: "opt-a", code: "a", display_name: "Option A" },
      { id: "opt-b", code: "b", display_name: "Option B" },
    ],
  },
  {
    spec_def_id: "def-bool",
    code: "supervised",
    display_name: "Supervised",
    value_type: "boolean" as const,
    options: [],
  },
];

describe("collapsePartSpecRows", () => {
  it("merges enum rows by spec_def_id", () => {
    const collapsed = collapsePartSpecRows([
      {
        spec_def_id: "def-enum",
        value_type: "enum",
        spec_option_id: "opt-a",
      } as never,
      {
        spec_def_id: "def-enum",
        value_type: "enum",
        spec_option_id: "opt-b",
      } as never,
    ]);

    expect(collapsed).toEqual([
      expect.objectContaining({
        spec_def_id: "def-enum",
        value_type: "enum",
        spec_option_ids: ["opt-a", "opt-b"],
      }),
    ]);
  });
});

describe("mergePartSpecsWithDefs", () => {
  it("builds one row per contextual def", () => {
    const merged = mergePartSpecsWithDefs([], defs);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      spec_def_id: "def-enum",
      spec_option_ids: [],
    });
  });

  it("preserves saved values for defs still in union", () => {
    const merged = mergePartSpecsWithDefs(
      [
        {
          spec_def_id: "def-enum",
          value_type: "enum",
          spec_option_ids: ["opt-a"],
        },
        {
          spec_def_id: "def-bool",
          value_type: "boolean",
          value_boolean: true,
        },
      ],
      defs,
    );

    expect(merged).toEqual([
      expect.objectContaining({ spec_def_id: "def-enum", spec_option_ids: ["opt-a"] }),
      expect.objectContaining({ spec_def_id: "def-bool", value_boolean: true }),
    ]);
  });

  it("drops stale defs when union shrinks", () => {
    const merged = mergePartSpecsWithDefs(
      [
        {
          spec_def_id: "def-removed",
          value_type: "text",
          value_text: "keep-me",
        },
        {
          spec_def_id: "def-bool",
          value_type: "boolean",
          value_boolean: false,
        },
      ],
      [defs[1]!],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.spec_def_id).toBe("def-bool");
  });

  it("filters enum selections to options still valid on def", () => {
    const merged = mergePartSpecsWithDefs(
      [
        {
          spec_def_id: "def-enum",
          value_type: "enum",
          spec_option_ids: ["opt-a", "opt-stale"],
        },
      ],
      defs,
    );

    expect(merged[0]?.spec_option_ids).toEqual(["opt-a"]);
  });
});

describe("expandPartSpecsForPatch", () => {
  it("expands enum multi-select to one PATCH row per option", () => {
    const patch = expandPartSpecsForPatch([
      {
        spec_def_id: "def-enum",
        value_type: "enum",
        spec_option_ids: ["opt-a", "opt-b"],
      },
      {
        spec_def_id: "def-bool",
        value_type: "boolean",
        value_boolean: true,
      },
      {
        spec_def_id: "def-text",
        value_type: "text",
        value_text: "  ",
      },
    ]);

    expect(patch).toEqual([
      {
        spec_def_id: "def-enum",
        spec_option_id: "opt-a",
        value_text: null,
        value_boolean: null,
      },
      {
        spec_def_id: "def-enum",
        spec_option_id: "opt-b",
        value_text: null,
        value_boolean: null,
      },
      {
        spec_def_id: "def-bool",
        spec_option_id: null,
        value_text: null,
        value_boolean: true,
      },
    ]);
  });
});
