import { describe, expect, it } from "vitest";

import { buildCreateUrl, resolveAfterCreateNavigation, sanitizeReturnTo } from "./surface-navigation";

describe("sanitizeReturnTo", () => {
  it("returns fallback when returnTo is missing", () => {
    expect(sanitizeReturnTo(null, "/sites")).toBe("/sites");
  });

  it("accepts same-origin relative paths", () => {
    expect(sanitizeReturnTo("/estimates/new", "/sites")).toBe("/estimates/new");
  });

  it("rejects scheme and protocol-relative URLs", () => {
    expect(sanitizeReturnTo("https://evil.test", "/sites")).toBe("/sites");
    expect(sanitizeReturnTo("//evil.test", "/sites")).toBe("/sites");
  });
});

describe("buildCreateUrl", () => {
  it("encodes sanitized returnTo on the new path", () => {
    expect(
      buildCreateUrl({
        newPath: "/sites/new",
        returnTo: "/estimates/abc",
        fallbackList: "/sites",
      }),
    ).toBe("/sites/new?returnTo=%2Festimates%2Fabc");
  });

  it("falls back to list route for invalid returnTo", () => {
    expect(
      buildCreateUrl({
        newPath: "/sites/new",
        returnTo: "https://evil.test",
        fallbackList: "/sites",
      }),
    ).toBe("/sites/new?returnTo=%2Fsites");
  });

  it("appends extra params after returnTo", () => {
    expect(
      buildCreateUrl({
        newPath: "/items/new",
        returnTo: "/items",
        fallbackList: "/items",
        params: { parent_id: "cat-1" },
      }),
    ).toBe("/items/new?returnTo=%2Fitems&parent_id=cat-1");
  });
});

describe("resolveAfterCreateNavigation", () => {
  it("redirects picker creates through returnTo with selectedId", () => {
    expect(
      resolveAfterCreateNavigation({
        returnTo: "/estimates/new",
        returnField: "profile.site_id",
        newId: "site-42",
        fallbackList: "/sites",
        fallbackDetail: (id) => `/sites/${id}`,
      }),
    ).toBe("/estimates/new?selectedId=site-42");
  });

  it("opens new record on detail route for standalone create", () => {
    expect(
      resolveAfterCreateNavigation({
        returnTo: "/sites",
        newId: "site-42",
        fallbackList: "/sites",
        fallbackDetail: (id) => `/sites/${id}`,
      }),
    ).toBe("/sites/site-42");
  });
});
