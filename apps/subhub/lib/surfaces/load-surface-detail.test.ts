import {
  principalWithRoles,
  type Manifest,
  type PermissionContext,
} from "@latch/contracts";
import { describe, expect, it, vi } from "vitest";

import { loadSurfaceDetailQuery } from "./load-surface-detail";

const manifest: Manifest = {
  surface: "contact_detail",
  fields: { display_name: ["read"] },
  actions: ["read"],
};

const ctx: PermissionContext = {
  principal: principalWithRoles("user-1", ["contact_reader"]),
  manifest,
  surface: "contact_detail",
};

const detailRow = { id: "c-1", display_name: { label: "Ada Lovelace" } };

vi.mock("../latch", () => ({
  resolveContext: vi.fn(),
}));

vi.mock("./surface-loader-registry", () => ({
  loadDetailFromRegistry: vi.fn(),
}));

describe("loadSurfaceDetailQuery", () => {
  it("returns { data, manifest } matching useSurfaceDetail queryFn shape", async () => {
    const { resolveContext } = await import("../latch");
    const { loadDetailFromRegistry } = await import("./surface-loader-registry");

    vi.mocked(resolveContext).mockResolvedValue(ctx);
    vi.mocked(loadDetailFromRegistry).mockResolvedValue(detailRow);

    const result = await loadSurfaceDetailQuery("contact_detail", "c-1");

    expect(result).toEqual({ data: detailRow, manifest });
    expect(resolveContext).toHaveBeenCalledWith({
      surfaceId: "contact_detail",
      entityId: "c-1",
    });
    expect(loadDetailFromRegistry).toHaveBeenCalledWith(
      "contact_detail",
      ctx,
      "c-1",
    );
  });

  it("throws SurfaceNotFoundError when read is not granted", async () => {
    const { resolveContext } = await import("../latch");
    const { loadDetailFromRegistry } = await import("./surface-loader-registry");
    const { SurfaceNotFoundError } = await import("./surface-not-found-error");

    vi.mocked(resolveContext).mockResolvedValue({
      ...ctx,
      manifest: { ...manifest, actions: [] },
    });
    vi.mocked(loadDetailFromRegistry).mockClear();

    await expect(loadSurfaceDetailQuery("contact_detail", "c-1")).rejects.toBeInstanceOf(
      SurfaceNotFoundError,
    );
    expect(loadDetailFromRegistry).not.toHaveBeenCalled();
  });
});
