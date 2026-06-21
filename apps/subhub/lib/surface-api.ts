import type { Manifest, SurfaceId } from "@latch/contracts";
import type { ApiSuccessBody } from "@latch/app-kit";

export type SurfaceListRow = {
  id: string;
  summary?: {
    id: string;
    display_name?: string;
    kind?: string;
    login_name?: string | null;
    login_email?: string | null;
    role_class?: string;
  };
};

export type SurfaceListData = {
  rows: SurfaceListRow[];
  total: number;
};

export type SurfaceDetailData = Record<string, unknown> & { id: string };

type SurfaceApiConfig = {
  listPath?: string;
  detailPath?: string;
  /** List surface to invalidate after detail mutate; defaults to `surfaceId`. */
  listSurfaceId?: SurfaceId;
};

export const SURFACE_API: Partial<Record<SurfaceId, SurfaceApiConfig>> = {
  user_list: { listPath: "/api/iam/users" },
  user_roles_detail: {
    detailPath: "/api/iam/users",
    listSurfaceId: "user_list",
  },
  role_list: { listPath: "/api/iam/roles" },
  role_detail: {
    detailPath: "/api/iam/roles",
    listSurfaceId: "role_list",
  },
  contact_list: { listPath: "/api/contacts" },
  contact_detail: {
    detailPath: "/api/contacts",
    listSurfaceId: "contact_list",
  },
  customer_list: { listPath: "/api/customers" },
  vendor_list: { listPath: "/api/vendors" },
  manufacturer_list: { listPath: "/api/manufacturers" },
};

export class SurfaceApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "SurfaceApiError";
  }
}

const parseResponse = async <T>(response: Response): Promise<ApiSuccessBody<T>> => {
  if (!response.ok) {
    let message = response.statusText;
    let details: unknown;

    try {
      const body = (await response.json()) as {
        error?: { message?: string; details?: unknown };
      };
      message = body.error?.message ?? message;
      details = body.error?.details;
    } catch {
      // ignore JSON parse errors
    }

    throw new SurfaceApiError(response.status, message, details);
  }

  return (await response.json()) as ApiSuccessBody<T>;
};

export const fetchSurfaceList = async (
  surfaceId: SurfaceId,
): Promise<ApiSuccessBody<SurfaceListData>> => {
  const path = SURFACE_API[surfaceId]?.listPath;
  if (!path) {
    throw new Error(`No list API path for surface: ${surfaceId}`);
  }

  const response = await fetch(path);
  return parseResponse<SurfaceListData>(response);
};

export const fetchSurfaceDetail = async (
  surfaceId: SurfaceId,
  id: string,
): Promise<ApiSuccessBody<SurfaceDetailData>> => {
  const path = SURFACE_API[surfaceId]?.detailPath;
  if (!path) {
    throw new Error(`No detail API path for surface: ${surfaceId}`);
  }

  return parseResponse<SurfaceDetailData>(await fetch(`${path}/${id}`));
};

export const patchSurfaceDetail = async (
  surfaceId: SurfaceId,
  id: string,
  body: Record<string, unknown>,
): Promise<ApiSuccessBody<SurfaceDetailData>> => {
  const path = SURFACE_API[surfaceId]?.detailPath;
  if (!path) {
    throw new Error(`No detail API path for surface: ${surfaceId}`);
  }

  return parseResponse<SurfaceDetailData>(
    await fetch(`${path}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
};

export const deleteSurfaceDetail = async (
  surfaceId: SurfaceId,
  id: string,
): Promise<void> => {
  const path = SURFACE_API[surfaceId]?.detailPath;
  if (!path) {
    throw new Error(`No detail API path for surface: ${surfaceId}`);
  }

  const response = await fetch(`${path}/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    await parseResponse<never>(response);
  }
};

export type SurfaceQueryResult<T> = {
  data: T;
  manifest: Manifest;
};
