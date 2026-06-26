import type { Manifest, SurfaceId } from "@latch/contracts";
import { surfaceAllows } from "@latch/contracts";
import { dehydrate, type DehydratedState } from "@tanstack/react-query";
import { notFound } from "next/navigation";

import {
  estimateSitePickerKey,
  jobSitePickerKey,
  manufacturerPickerKey,
  surfaceDetailKey,
  surfaceListKey,
  vendorPickerKey,
} from "../hooks/surface-query-keys";
import { resolveContext } from "../latch";
import { fetchEstimateSitePicker, fetchJobSitePicker, fetchSurfaceList } from "../surface-api";
import { subhubRegistry } from "../policy-registry";
import { getQueryClient } from "../query-client";
import type { SurfaceQueryResult, SurfaceDetailData } from "../surface-api";

import { assertSurfaceRead } from "./assert-surface-read";
import { loadSurfaceDetailQuery } from "./load-surface-detail";
import { loadSurfaceListQuery } from "./load-surface-list";
import {
  type SurfaceDetailId,
  type SurfaceListId,
} from "./surface-loader-registry";
import { isSurfaceNotFoundError } from "./surface-not-found-error";

const mapLoaderError = (error: unknown): never => {
  if (isSurfaceNotFoundError(error)) {
    notFound();
  }
  throw error;
};

export const prefetchSurfaceList = async (
  surfaceId: SurfaceListId,
  query?: Record<string, unknown>,
): Promise<DehydratedState> => {
  const queryClient = getQueryClient();
  try {
    await queryClient.prefetchQuery({
      queryKey: surfaceListKey(surfaceId),
      queryFn: () => loadSurfaceListQuery(surfaceId, query),
    });
  } catch (error) {
    mapLoaderError(error);
  }
  return dehydrate(queryClient);
};

export const prefetchSurfaceDetail = async (
  surfaceId: SurfaceDetailId,
  entityId: string,
  extraLists: SurfaceListId[] = [],
): Promise<{ state: DehydratedState; manifest: Manifest }> => {
  const queryClient = getQueryClient();
  const queryKey = surfaceDetailKey(surfaceId, entityId);
  try {
    await Promise.all([
      queryClient.fetchQuery({
        queryKey,
        queryFn: () => loadSurfaceDetailQuery(surfaceId, entityId),
      }),
      ...extraLists.map((listId) =>
        queryClient.fetchQuery({
          queryKey: surfaceListKey(listId),
          queryFn: () => loadSurfaceListQuery(listId),
        }),
      ),
    ]);
  } catch (error) {
    mapLoaderError(error);
  }

  const cached = queryClient.getQueryData<SurfaceQueryResult<SurfaceDetailData>>(
    queryKey,
  );
  if (!cached?.manifest) {
    throw new Error(`Prefetch miss for ${surfaceId} ${entityId}`);
  }

  return { state: dehydrate(queryClient), manifest: cached.manifest };
};

export type SiteHubLinkAccess = {
  customer: boolean;
  propertyOwner: boolean;
};

export const prefetchEstimateSitePicker = async (): Promise<void> => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: estimateSitePickerKey,
    queryFn: () => fetchEstimateSitePicker(),
  });
};

export const prefetchJobSitePicker = async (): Promise<void> => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: jobSitePickerKey,
    queryFn: () => fetchJobSitePicker(),
  });
};

export const prefetchManufacturerPicker = async (): Promise<void> => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: manufacturerPickerKey,
    queryFn: () => fetchSurfaceList("manufacturer_list"),
  });
};

export const prefetchVendorPicker = async (): Promise<void> => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: vendorPickerKey,
    queryFn: () => fetchSurfaceList("vendor_list"),
  });
};

export type PartLinkAccess = {
  manufacturer: boolean;
  vendor: boolean;
  canCreateManufacturer: boolean;
};

/** Whether the principal may navigate to party hub routes from part detail. */
export const resolvePartLinkAccess = async (): Promise<PartLinkAccess> => {
  const checkRead = async (surfaceId: SurfaceId): Promise<boolean> => {
    if (!(surfaceId in subhubRegistry)) {
      return false;
    }

    try {
      const { manifest } = await resolveContext({ surfaceId });
      return surfaceAllows(manifest, "read");
    } catch {
      return false;
    }
  };

  const checkManufacturerCreate = async (): Promise<boolean> => {
    if (!("manufacturer_detail" in subhubRegistry)) {
      return false;
    }

    try {
      const { manifest } = await resolveContext({
        surfaceId: "manufacturer_detail",
        entityId: "new",
      });
      return surfaceAllows(manifest, "write");
    } catch {
      return false;
    }
  };

  return {
    manufacturer: await checkRead("manufacturer_detail"),
    vendor: await checkRead("vendor_detail"),
    canCreateManufacturer: await checkManufacturerCreate(),
  };
};

/** Whether the principal may navigate to `site_detail` from estimate profile. */
export const resolveSiteDetailLinkAccess = async (): Promise<boolean> => {
  try {
    const { manifest } = await resolveContext({ surfaceId: "site_detail" });
    return surfaceAllows(manifest, "read");
  } catch {
    return false;
  }
};

/** Whether the principal may navigate to `estimate_detail` from job profile. */
export const resolveEstimateDetailLinkAccess = async (): Promise<boolean> => {
  try {
    const { manifest } = await resolveContext({ surfaceId: "estimate_detail" });
    return surfaceAllows(manifest, "read");
  } catch {
    return false;
  }
};

/** Whether the principal may navigate to a hub detail route (manifest-gated). */
export const resolveHubLinkAccess = async (): Promise<SiteHubLinkAccess> => {
  const check = async (surfaceId: SurfaceId): Promise<boolean> => {
    if (!(surfaceId in subhubRegistry)) {
      return false;
    }

    try {
      const { manifest } = await resolveContext({ surfaceId });
      return surfaceAllows(manifest, "read");
    } catch {
      return false;
    }
  };

  return {
    customer: await check("customer_list"),
    propertyOwner: await check("property_owner_list"),
  };
};

/** Create flow — manifest + picker lists only (no detail GET). */
export const prefetchSurfaceCreate = async (
  surfaceId: SurfaceDetailId,
  entityId: string,
  extraLists: SurfaceListId[] = [],
): Promise<{ state: DehydratedState; manifest: Manifest }> => {
  const queryClient = getQueryClient();
  const ctx = await resolveContext({ surfaceId, entityId });
  assertSurfaceRead(ctx);

  await Promise.all(
    extraLists.map((listId) =>
      queryClient.prefetchQuery({
        queryKey: surfaceListKey(listId),
        queryFn: () => loadSurfaceListQuery(listId),
      }),
    ),
  );

  return { state: dehydrate(queryClient), manifest: ctx.manifest };
};
