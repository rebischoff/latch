import { afterEach, describe, expect, it } from "vitest";

import { getManifestCacheMode } from "./latch-config.js";

describe("getManifestCacheMode", () => {
  const previous = process.env.LATCH_MANIFEST_CACHE_MODE;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.LATCH_MANIFEST_CACHE_MODE;
    } else {
      process.env.LATCH_MANIFEST_CACHE_MODE = previous;
    }
  });

  it("defaults to request when env is unset", () => {
    delete process.env.LATCH_MANIFEST_CACHE_MODE;
    expect(getManifestCacheMode()).toBe("request");
  });

  it("honors LATCH_MANIFEST_CACHE_MODE override", () => {
    process.env.LATCH_MANIFEST_CACHE_MODE = "none";
    expect(getManifestCacheMode()).toBe("none");
  });
});
