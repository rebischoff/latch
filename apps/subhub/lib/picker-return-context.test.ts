import { describe, expect, it } from "vitest";

import {
  buildPickerCreateUrl,
  parseReturnContext,
  redirectAfterCreate,
  redirectOnCancel,
} from "./picker-return-context";

describe("buildPickerCreateUrl", () => {
  it("builds manufacturer create URL with encoded return context", () => {
    const url = buildPickerCreateUrl({
      target: "manufacturer",
      createId: "mfg-new",
      returnTo: "/parts/part-1?create=1",
      returnField: "profile.manufacturer_party_id",
    });

    expect(url).toBe(
      "/manufacturers/mfg-new?create=1&returnTo=%2Fparts%2Fpart-1%3Fcreate%3D1&returnField=profile.manufacturer_party_id",
    );
  });

  it("omits returnField when not provided", () => {
    const url = buildPickerCreateUrl({
      target: "manufacturer",
      createId: "mfg-new",
      returnTo: "/parts/part-1",
    });

    expect(url).toBe("/manufacturers/mfg-new?create=1&returnTo=%2Fparts%2Fpart-1");
  });
});

describe("parseReturnContext", () => {
  it("parses create and return params from target detail URL", () => {
    const params = new URLSearchParams(
      "create=1&returnTo=%2Fparts%2Fpart-1%3Fcreate%3D1&returnField=profile.manufacturer_party_id",
    );

    expect(parseReturnContext(params)).toEqual({
      isCreate: true,
      returnTo: "/parts/part-1?create=1",
      returnField: "profile.manufacturer_party_id",
      selectedId: null,
    });
  });

  it("parses selectedId on origin return URL", () => {
    const params = new URLSearchParams("create=1&selectedId=mfg-42");

    expect(parseReturnContext(params)).toEqual({
      isCreate: true,
      returnTo: null,
      returnField: null,
      selectedId: "mfg-42",
    });
  });
});

describe("redirectAfterCreate", () => {
  it("appends selectedId to returnTo preserving existing query", () => {
    expect(redirectAfterCreate("/parts/part-1?create=1", "mfg-42")).toBe(
      "/parts/part-1?create=1&selectedId=mfg-42",
    );
  });

  it("adds selectedId when returnTo has no query string", () => {
    expect(redirectAfterCreate("/parts/part-1", "mfg-42")).toBe(
      "/parts/part-1?selectedId=mfg-42",
    );
  });
});

describe("redirectOnCancel", () => {
  it("returns returnTo unchanged", () => {
    expect(redirectOnCancel("/parts/part-1?create=1")).toBe("/parts/part-1?create=1");
  });

  it("strips selectedId when present", () => {
    expect(redirectOnCancel("/parts/part-1?create=1&selectedId=mfg-42")).toBe(
      "/parts/part-1?create=1",
    );
  });
});
