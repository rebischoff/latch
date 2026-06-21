import { describe, expect, it } from "vitest";

import { foldRoleGrantRows } from "./preload-role-grants";

describe("foldRoleGrantRows", () => {
  it("folds sparse grant rows with row_scope from latch_role_surfaces", () => {
    const bindings = foldRoleGrantRows([
      {
        role_id: "role-a",
        surface_id: "job_list",
        field_id: null,
        action: "read",
        row_scope: "own",
      },
      {
        role_id: "role-a",
        surface_id: "job_list",
        field_id: "summary",
        action: "read",
        row_scope: "own",
      },
      {
        role_id: "role-a",
        surface_id: "job_list",
        field_id: "summary",
        action: "write",
        row_scope: "own",
      },
    ]);

    expect(bindings.job_list?.["role-a"]).toEqual({
      rowScope: "own",
      surfaceActions: ["read"],
      fields: [{ field: "summary", actions: ["read", "write"] }],
    });
  });
});
