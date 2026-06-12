import { describe, expect, it } from "vitest";

import {
  crossCheckYamlColumnTypes,
  parseCreateTableColumns,
} from "./migration-ddl.js";

const widgetsSql = `
CREATE TABLE widgets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  status TEXT NOT NULL,
  scope_id TEXT NOT NULL
);
`;

describe("parseCreateTableColumns", () => {
  it("extracts column types from CREATE TABLE", () => {
    const columns = parseCreateTableColumns(widgetsSql, "widgets");
    expect(columns.get("label")).toBe("TEXT");
    expect(columns.get("status")).toBe("TEXT");
    expect(columns.get("scope_id")).toBe("TEXT");
  });
});

describe("crossCheckYamlColumnTypes", () => {
  it("passes when YAML types match migration DDL", () => {
    const errors = crossCheckYamlColumnTypes(
      "widgets",
      [
        { column: "widgets.label", type: "string" },
        { column: "widgets.status", type: "string" },
        { column: "widgets.scope_id", type: "string" },
      ],
      widgetsSql,
    );
    expect(errors).toEqual([]);
  });

  it("reports mismatched types", () => {
    const errors = crossCheckYamlColumnTypes(
      "widgets",
      [{ column: "widgets.label", type: "number" }],
      widgetsSql,
    );
    expect(errors[0]).toMatch(/label/);
  });
});
