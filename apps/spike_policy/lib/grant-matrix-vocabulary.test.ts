import { describe, expect, it } from "vitest";

import { fixtureGrantMatrixSurfaces } from "./grant-matrix-vocabulary.js";
import { spikePolicyRegistry } from "./policy-registry.js";

describe("fixtureGrantMatrixSurfaces", () => {
  it("lists all 5 fixture business surfaces", () => {
    const surfaces = fixtureGrantMatrixSurfaces(spikePolicyRegistry);
    expect(surfaces).toHaveLength(5);
    expect(surfaces.map((surface) => surface.surfaceId).sort()).toEqual(
      [
        "alpha_list",
        "beta_detail",
        "delta_report",
        "gamma_form",
        "zeta_inventory",
      ].sort(),
    );
  });
});
