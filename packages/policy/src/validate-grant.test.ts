import { describe, expect, it } from "vitest";

import { ValidationError } from "@latch/contracts";

import { definePolicyRegistry, defineSurfacePolicy } from "./registry";
import {
  resolveGrantSurfaceDef,
  validateGrantAgainstCatalog,
  validateGrantTuple,
} from "./validate-grant";

const widgetList = defineSurfacePolicy({
  surface: "widget_list",
  fieldIds: ["summary", "status"],
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "business",
});

const roleDetail = defineSurfacePolicy({
  surface: "role_detail",
  fieldIds: ["catalog", "surface_bindings", "grants"],
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
  kind: "iam",
});

const registry = definePolicyRegistry(widgetList, roleDetail);

describe("validateGrantAgainstCatalog", () => {
  it("accepts known field grant", () => {
    expect(() =>
      validateGrantAgainstCatalog(
        { fieldId: "summary", action: "read" },
        widgetList,
      ),
    ).not.toThrow();
  });

  it("accepts known surface-level grant", () => {
    expect(() =>
      validateGrantAgainstCatalog(
        { fieldId: null, action: "read" },
        widgetList,
      ),
    ).not.toThrow();
  });

  it("rejects unknown field", () => {
    expect(() =>
      validateGrantAgainstCatalog(
        { fieldId: "nope", action: "read" },
        widgetList,
      ),
    ).toThrow(ValidationError);
  });

  it("rejects unknown field action", () => {
    expect(() =>
      validateGrantAgainstCatalog(
        { fieldId: "summary", action: "delete" },
        widgetList,
      ),
    ).toThrow(ValidationError);
  });

  it("rejects unknown surface action", () => {
    expect(() =>
      validateGrantAgainstCatalog(
        { fieldId: null, action: "delete" },
        widgetList,
      ),
    ).toThrow(ValidationError);
  });
});

describe("validateGrantTuple", () => {
  it("rejects unknown surface", () => {
    expect(() =>
      validateGrantTuple(
        { surfaceId: "missing", fieldId: "summary", action: "read" },
        registry,
      ),
    ).toThrow(ValidationError);
  });

  it("rejects IAM surface grants by default", () => {
    expect(() =>
      validateGrantTuple(
        { surfaceId: "role_detail", fieldId: "catalog", action: "read" },
        registry,
      ),
    ).toThrow(ValidationError);
  });

  it("allows IAM surface when opted in", () => {
    expect(() =>
      validateGrantTuple(
        { surfaceId: "role_detail", fieldId: "catalog", action: "read" },
        registry,
        { allowIamSurfaces: true },
      ),
    ).not.toThrow();
  });
});

describe("resolveGrantSurfaceDef", () => {
  it("returns catalog entry for known surface", () => {
    expect(resolveGrantSurfaceDef("widget_list", registry).surface).toBe(
      "widget_list",
    );
  });
});
