import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  createMemoryRoleGrantProvider,
  definePolicyRegistry,
  PolicyService,
} from "@latch/policy";

import {
  generateSurfaceFile,
  parseSurfaceYaml,
  REPO_ROOT,
} from "./generate.js";

const widgetListSurfaceYaml = `
id: widget_list
displayName: Widget list
anchorTable: widgets
kind: business
fieldActions:
  - read
  - write
surfaceActions:
  - read
  - write
tables:
  - widgets
fields:
  - id: summary
    columns:
      - column: widgets.id
        type: string
      - column: widgets.label
        type: string
  - id: status
    columns:
      - column: widgets.status
        type: string
`;

describe("parseSurfaceYaml — policy vocabulary", () => {
  it("parses kind and action vocabulary from surface YAML", () => {
    const surface = parseSurfaceYaml(
      widgetListSurfaceYaml,
      "fixture/widget_list.surface.yaml",
    );

    expect(surface.kind).toBe("business");
    expect(surface.fieldActions).toEqual(["read", "write"]);
    expect(surface.surfaceActions).toEqual(["read", "write"]);
  });
});

describe("generateSurfaceFile — policy catalog emit", () => {
  it("emits defineSurfacePolicy catalog in schema.generated.ts", () => {
    const surface = parseSurfaceYaml(
      widgetListSurfaceYaml,
      "fixture/widget_list.surface.yaml",
    );

    const file = generateSurfaceFile(
      surface,
      "widget_list.surface.yaml",
      "generated/widget_list.schema.generated.ts",
    );

    expect(file.content).toContain("defineSurfacePolicy");
    expect(file.content).toContain("WidgetListFieldIds");
    expect(file.content).toContain("widgetListSurfacePolicyDef");
    expect(file.content).toContain("fieldActions:");
    expect(file.content).toContain("surfaceActions:");
    expect(file.content).not.toContain("roles:");
  });
});

describe("generated widget_list schema catalog", () => {
  it("resolves different manifests per role when grants are injected at runtime", async () => {
    const schemaPath = path.join(
      REPO_ROOT,
      "apps/spike_codegen/modules/widget/generated/widget_list.schema.generated.ts",
    );
    const { widgetListSurfacePolicyDef } = await import(schemaPath);

    const grantProvider = createMemoryRoleGrantProvider({
      widget_list: {
        widget_viewer: {
          rowScope: "own",
          fields: [{ field: "summary", actions: ["read"] }],
          surfaceActions: ["read"],
        },
        widget_editor: {
          rowScope: "all",
          fields: [
            { field: "summary", actions: ["read", "write"] },
            { field: "status", actions: ["read", "write"] },
          ],
          surfaceActions: ["read", "write"],
        },
      },
    });

    const policy = new PolicyService({
      registry: definePolicyRegistry(widgetListSurfacePolicyDef),
      grantProvider,
    });

    const viewer = policy.resolve(
      { id: "user-1", roles: ["widget_viewer"] },
      { surface: "widget_list" },
    );
    expect(viewer.fields.summary).toEqual(["read"]);
    expect(viewer.fields.status).toEqual([]);
    expect(viewer.rowScope).toBe("own");

    const editor = policy.resolve(
      { id: "user-2", roles: ["widget_editor"] },
      { surface: "widget_list" },
    );
    expect(editor.fields.summary).toEqual(["read", "write"]);
    expect(editor.fields.status).toEqual(["read", "write"]);
    expect(editor.rowScope).toBe("all");
  });
});
