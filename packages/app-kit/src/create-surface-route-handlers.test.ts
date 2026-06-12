import { describe, expect, it, vi } from "vitest";

import {
  NotFoundError,
  principalWithRoles,
  type Manifest,
  type PermissionContext,
} from "@latch/contracts";
import type { SurfaceDal } from "@latch/dal";

import { createSurfaceRouteHandlers } from "./create-surface-route-handlers.js";

const manifest: Manifest = {
  surface: "widget_detail",
  fields: { label: ["read"] },
  actions: ["read"],
};

const ctx: PermissionContext = {
  principal: principalWithRoles("user-1", ["widget_reader"]),
  manifest,
  surface: "widget_detail",
};

describe("createSurfaceRouteHandlers — REST read", () => {
  it("GET returns { data, manifest } for a detail surface", async () => {
    const dal: SurfaceDal = {
      get: vi.fn(async () => ({ id: "w-1", label: { label: "Alpha" } })),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const resolveContext = vi.fn(async () => ctx);
    const resolveContextFresh = vi.fn(async () => ctx);

    const { GET } = createSurfaceRouteHandlers({
      dal,
      resolveContext,
      resolveContextFresh,
      toDetailInput: (entityId) => ({
        surfaceId: "widget_detail",
        entityId,
      }),
    });

    const response = await GET(new Request("http://localhost/api/widgets/w-1"), {
      params: Promise.resolve({ id: "w-1" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: Record<string, unknown>;
      manifest: Manifest;
    };
    expect(body.data).toEqual({ id: "w-1", label: { label: "Alpha" } });
    expect(body.manifest).toEqual(manifest);
    expect(resolveContext).toHaveBeenCalledWith(
      {
        surfaceId: "widget_detail",
        entityId: "w-1",
      },
      undefined,
    );
    expect(dal.get).toHaveBeenCalledWith(ctx, "w-1");
  });

  it("maps NotFoundError to 404", async () => {
    const dal: SurfaceDal = {
      get: vi.fn(() => {
        throw new NotFoundError();
      }),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const { GET } = createSurfaceRouteHandlers({
      dal,
      resolveContext: async () => ctx,
      resolveContextFresh: async () => ctx,
      toDetailInput: (entityId) => ({
        surfaceId: "widget_detail",
        entityId,
      }),
    });

    const response = await GET(new Request("http://localhost/api/widgets/hidden"), {
      params: Promise.resolve({ id: "hidden" }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
