import { describe, expect, it } from "vitest";

import {
  buildCreateUrl,
  buildDetailHref,
  resolveActiveTab,
  resolveAfterCreateNavigation,
  sanitizeReturnTo,
} from "./surface-navigation";

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

describe("buildDetailHref", () => {
  it("preserves tab and omits unlisted keys", () => {
    expect(
      buildDetailHref({
        detailPath: "/parts/b",
        currentSearch: "?tab=specs&returnTo=/x",
      }),
    ).toBe("/parts/b?tab=specs");
  });

  it("returns bare path when search is empty", () => {
    expect(buildDetailHref({ detailPath: "/parts/b", currentSearch: "" })).toBe(
      "/parts/b",
    );
    expect(buildDetailHref({ detailPath: "/parts/b" })).toBe("/parts/b");
  });

  it("ignores unknown preserve keys that are unset", () => {
    expect(
      buildDetailHref({
        detailPath: "/jobs/1",
        currentSearch: "tab=billing",
        preserve: ["tab", "nope"],
      }),
    ).toBe("/jobs/1?tab=billing");
  });

  it("accepts URLSearchParams", () => {
    const search = new URLSearchParams({ tab: "line-items", returnTo: "/x" });
    expect(
      buildDetailHref({ detailPath: "/estimates/e1", currentSearch: search }),
    ).toBe("/estimates/e1?tab=line-items");
  });
});

describe("resolveActiveTab", () => {
  it("returns requested when available", () => {
    expect(resolveActiveTab("specs", ["general", "specs"], "general")).toBe(
      "specs",
    );
  });

  it("falls back when requested is unavailable", () => {
    expect(resolveActiveTab("specs", ["purchase"], "purchase")).toBe("purchase");
  });

  it("falls back when requested is null or unknown", () => {
    expect(resolveActiveTab(null, ["overview", "billing"], "overview")).toBe(
      "overview",
    );
    expect(resolveActiveTab("nope", ["overview", "billing"], "overview")).toBe(
      "overview",
    );
  });
});
