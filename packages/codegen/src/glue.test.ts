import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import {
  principalWithRoles,
  type Manifest,
  type PermissionContext,
} from "@latch/contracts";
import { createSurfaceDal } from "@latch/dal";

import { REPO_ROOT } from "./generate.js";
import { analyzeSurfaceGlue, generateGlueFile } from "./glue.js";
import { parseSurfaceYaml } from "./generate.js";
import type { SurfaceDef } from "./types.js";

const widgetListYaml = `
id: widget_list
displayName: Widget list
anchorTable: widgets
tables:
  - widgets
fields:
  - id: summary
    columns:
      - column: widgets.id
        type: string
      - column: widgets.label
        type: string
`;

const widgetJoinYaml = `
id: widget_join
displayName: Widget with tags
anchorTable: widgets
tables:
  - widgets
  - widget_tags
fields:
  - id: summary
    columns:
      - column: widgets.id
        type: string
      - column: widgets.label
        type: string
  - id: tags
    columns:
      - column: widget_tags.tag
        type: string
`;

const parseFixture = (raw: string, id: string): SurfaceDef =>
  parseSurfaceYaml(raw, `fixture/${id}.surface.yaml`);

describe("analyzeSurfaceGlue", () => {
  it("classifies single-table surfaces when all columns share anchorTable", () => {
    const surface = parseFixture(widgetListYaml, "widget_list");
    const analysis = analyzeSurfaceGlue(surface);

    expect(analysis.mode).toBe("single-table");
    expect(analysis.tables).toEqual(["widgets"]);
    expect(analysis.anchorColumns.map(([prop]) => prop)).toEqual(["id", "label"]);
  });

  it("classifies multi-table surfaces when columns span tables", () => {
    const surface = parseFixture(widgetJoinYaml, "widget_join");
    const analysis = analyzeSurfaceGlue(surface);

    expect(analysis.mode).toBe("multi-table");
    expect(analysis.tables).toEqual(["widget_tags", "widgets"]);
  });
});

describe("generateGlueFile", () => {
  it("emits descriptor helpers for single-table surfaces", () => {
    const surface = parseFixture(widgetListYaml, "widget_list");
    const file = generateGlueFile(
      surface,
      "widget_list.surface.yaml",
      "generated/widget_list.glue.generated.ts",
    );

    expect(file.glueMode).toBe("single-table");
    expect(file.content).toContain("export const widgetListDescriptor");
    expect(file.content).toContain("projectWidgetListRow");
    expect(file.content).toContain("applyWidgetListPatch");
    expect(file.content).not.toContain("MULTI_TABLE_GLUE_SKIPPED");
  });

  it("emits a skip marker for multi-table surfaces", () => {
    const surface = parseFixture(widgetJoinYaml, "widget_join");
    const file = generateGlueFile(
      surface,
      "widget_join.surface.yaml",
      "generated/widget_join.glue.generated.ts",
    );

    expect(file.glueMode).toBe("multi-table");
    expect(file.content).toContain("MULTI_TABLE_GLUE_SKIPPED");
    expect(file.content).not.toContain("SurfaceDescriptor");
  });
});

describe("generated widget_list glue + DAL kernel", () => {
  const audit = createMemoryAuditWriter();

  afterEach(() => {
    audit.reset();
    setAuditWriter(null);
  });

  it("composes with createSurfaceDal for get and patch", async () => {
    setAuditWriter(audit.writer);
    const gluePath = path.join(
      REPO_ROOT,
      "apps/spike_codegen/modules/widget/generated/widget_list.glue.generated.ts",
    );
    const { widgetListDescriptor } = await import(gluePath);

    type WidgetRow = { id: string; label: string };

    const store = {
      rows: new Map<string, WidgetRow>([
        ["w-1", { id: "w-1", label: "Alpha" }],
      ]),
      get: (id: string) => store.rows.get(id),
      list: () => ({ rows: [...store.rows.values()], total: 1 }),
      upsert: (row: WidgetRow) => {
        store.rows.set(row.id, row);
      },
      delete: (id: string) => {
        store.rows.delete(id);
      },
      getRelated: () => [],
      replaceRelated: () => {},
      isRowVisibleToPrincipal: () => true,
    };

    const manifest: Manifest = {
      surface: "widget_list",
      actions: ["read", "write"],
      rowScope: "all",
      fields: {
        summary: ["read", "write"],
      },
    };

    const ctx: PermissionContext = {
      principal: principalWithRoles("user-1", ["fixture"]),
      manifest,
      surface: "widget_list",
    };

    const dal = createSurfaceDal(widgetListDescriptor, store);

    const dto = dal.get(ctx, "w-1");
    expect(dto).toEqual({
      id: "w-1",
      summary: { id: "w-1", label: "Alpha" },
    });

    const patched = await dal.patch(ctx, "w-1", {
      summary: { label: "Beta" },
    });
    expect(patched.summary).toEqual({ id: "w-1", label: "Beta" });
    expect(store.get("w-1")?.label).toBe("Beta");
  });
});
