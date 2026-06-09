import { describe, expect, it } from "vitest";

import { foldRoleGrantRows } from "./fold-role-grants.js";

const FIELD_TECH_ID = "b1000001-0000-4000-8000-000000000001";
const OFFICE_ADMIN_ID = "b1000001-0000-4000-8000-000000000002";

describe("foldRoleGrantRows", () => {
  it("folds fixture pilot rows with row_scope from bindings", () => {
    const bindings = foldRoleGrantRows([
      {
        roleId: FIELD_TECH_ID,
        surfaceId: "widget_list",
        fieldId: "summary",
        action: "read",
        rowScope: "own",
      },
      {
        roleId: FIELD_TECH_ID,
        surfaceId: "widget_list",
        fieldId: "status",
        action: "read",
        rowScope: "own",
      },
      {
        roleId: OFFICE_ADMIN_ID,
        surfaceId: "widget_list",
        fieldId: "summary",
        action: "read",
        rowScope: "all",
      },
      {
        roleId: OFFICE_ADMIN_ID,
        surfaceId: "widget_list",
        fieldId: "summary",
        action: "write",
        rowScope: "all",
      },
      {
        roleId: OFFICE_ADMIN_ID,
        surfaceId: "widget_list",
        fieldId: "status",
        action: "read",
        rowScope: "all",
      },
      {
        roleId: OFFICE_ADMIN_ID,
        surfaceId: "widget_list",
        fieldId: "status",
        action: "write",
        rowScope: "all",
      },
    ]);

    const fieldTech = bindings.find(
      (b) => b.roleId === FIELD_TECH_ID && b.surface === "widget_list",
    );
    const officeAdmin = bindings.find(
      (b) => b.roleId === OFFICE_ADMIN_ID && b.surface === "widget_list",
    );

    expect(fieldTech).toMatchObject({
      rowScope: "own",
      fields: [
        { field: "summary", actions: ["read"] },
        { field: "status", actions: ["read"] },
      ],
    });
    expect(officeAdmin).toMatchObject({
      rowScope: "all",
      fields: [
        { field: "summary", actions: ["read", "write"] },
        { field: "status", actions: ["read", "write"] },
      ],
    });
  });

  it("collects surface-level actions when field_id is null", () => {
    const bindings = foldRoleGrantRows([
      {
        roleId: FIELD_TECH_ID,
        surfaceId: "widget_list",
        fieldId: null,
        action: "read",
        rowScope: "own",
      },
    ]);

    expect(bindings).toEqual([
      {
        roleId: FIELD_TECH_ID,
        surface: "widget_list",
        rowScope: "own",
        fields: [],
        surfaceActions: ["read"],
      },
    ]);
  });
});
