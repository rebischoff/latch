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
    name?: string;
    role_class?: string;
  };
};

export type SurfaceListData = {
  rows: SurfaceListRow[];
  total: number;
};

export type SurfaceDetailData = Record<string, unknown> & { id: string };

export type SitePartyPickerRole = "customer" | "property_owner" | "any";

export type SitePartyPickerRow = {
  id: string;
  display_name: string;
  kind: string;
};

export type SitePartyPickerData = {
  rows: SitePartyPickerRow[];
  total: number;
};

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
  manufacturer_detail: {
    detailPath: "/api/manufacturers",
    listSurfaceId: "manufacturer_list",
  },
  employee_list: { listPath: "/api/employees" },
  employee_detail: {
    detailPath: "/api/employees",
    listSurfaceId: "employee_list",
  },
  site_list: { listPath: "/api/sites" },
  site_detail: {
    detailPath: "/api/sites",
    listSurfaceId: "site_list",
  },
  site_contact_relation_table: {
    listPath: "/api/sites/contact-relations",
    detailPath: "/api/sites/contact-relations",
  },
  job_party_relation_table: {
    listPath: "/api/estimates/party-relations",
    detailPath: "/api/estimates/party-relations",
  },
  estimate_list: { listPath: "/api/estimates" },
  estimate_detail: {
    detailPath: "/api/estimates",
    listSurfaceId: "estimate_list",
  },
  job_list: { listPath: "/api/jobs" },
  job_detail: {
    detailPath: "/api/jobs",
    listSurfaceId: "job_list",
  },
  part_list: { listPath: "/api/parts" },
  part_detail: {
    detailPath: "/api/parts",
    listSurfaceId: "part_list",
  },
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
        error?: {
          message?: string;
          details?: unknown;
          code?: string;
          entity?: string;
          blockers?: Array<{ type: string; count: number }>;
        };
      };
      message = body.error?.message ?? message;
      details =
        body.error?.details ??
        (body.error?.code || body.error?.blockers
          ? {
              code: body.error.code,
              entity: body.error.entity,
              blockers: body.error.blockers,
            }
          : undefined);
    } catch {
      // ignore JSON parse errors
    }

    throw new SurfaceApiError(response.status, message, details);
  }

  return (await response.json()) as ApiSuccessBody<T>;
};

export type EstimateSitePickerRow = {
  id: string;
  name: string;
};

export type EstimateSitePickerData = {
  rows: EstimateSitePickerRow[];
  total: number;
};

export const fetchEstimateSitePicker = async (): Promise<
  ApiSuccessBody<EstimateSitePickerData>
> => {
  const response = await fetch("/api/estimates/pickers/sites");
  return parseResponse<EstimateSitePickerData>(response);
};

export type EstimateSystemPickerSpecOption = {
  display_name: string;
  id: string;
};

export type EstimateSystemPickerSpecDef = {
  def_display_name: string;
  options: EstimateSystemPickerSpecOption[];
  system_spec_def_id: string;
  value_type: "enum" | "boolean" | "text";
};

export type EstimateSystemPickerRow = {
  id: string;
  name: string;
  spec_defs: EstimateSystemPickerSpecDef[];
};

export type EstimateSystemPickerData = {
  rows: EstimateSystemPickerRow[];
  total: number;
};

export const fetchEstimateSystemPicker = async (): Promise<
  ApiSuccessBody<EstimateSystemPickerData>
> => {
  const response = await fetch("/api/estimates/pickers/systems");
  return parseResponse<EstimateSystemPickerData>(response);
};

export const fetchJobSitePicker = async (): Promise<
  ApiSuccessBody<EstimateSitePickerData>
> => {
  const response = await fetch("/api/jobs/pickers/sites");
  return parseResponse<EstimateSitePickerData>(response);
};

export const fetchSitePartyPicker = async (
  role: SitePartyPickerRole,
): Promise<ApiSuccessBody<SitePartyPickerData>> => {
  const response = await fetch(`/api/sites/pickers/parties?role=${role}`);
  return parseResponse<SitePartyPickerData>(response);
};

export type QuickCreatePersonInput = {
  display_name: string;
  phone?: string;
};

export const createSiteContactPerson = async (
  body: QuickCreatePersonInput,
): Promise<ApiSuccessBody<{ row: SitePartyPickerRow }>> => {
  const response = await fetch("/api/sites/pickers/parties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<{ row: SitePartyPickerRow }>(response);
};

export const fetchSurfaceList = async (
  surfaceId: SurfaceId,
  query?: Record<string, string | number | undefined>,
): Promise<ApiSuccessBody<SurfaceListData>> => {
  const path = SURFACE_API[surfaceId]?.listPath;
  if (!path) {
    throw new Error(`No list API path for surface: ${surfaceId}`);
  }

  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    }
  }

  const qs = params.toString();
  const response = await fetch(qs ? `${path}?${qs}` : path);
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

export const postSurfaceDetail = async (
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
};

/** POST to a catalog table list route (no entity id in URL). */
export const postSurfaceListCreate = async (
  surfaceId: SurfaceId,
  body: Record<string, unknown>,
): Promise<ApiSuccessBody<SurfaceDetailData>> => {
  const path = SURFACE_API[surfaceId]?.listPath;
  if (!path) {
    throw new Error(`No list API path for surface: ${surfaceId}`);
  }

  return parseResponse<SurfaceDetailData>(
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
};

/** PATCH replace-array on a catalog table list route. */
export const patchSurfaceList = async (
  surfaceId: SurfaceId,
  body: Record<string, unknown>,
): Promise<ApiSuccessBody<SurfaceListData>> => {
  const path = SURFACE_API[surfaceId]?.listPath;
  if (!path) {
    throw new Error(`No list API path for surface: ${surfaceId}`);
  }

  return parseResponse<SurfaceListData>(
    await fetch(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
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

export const postManufacturerAddRole = async (
  id: string,
  role: string,
): Promise<ApiSuccessBody<SurfaceDetailData>> => {
  const path = SURFACE_API.manufacturer_detail?.detailPath;
  if (!path) {
    throw new Error("No detail API path for manufacturer_detail");
  }

  return parseResponse<SurfaceDetailData>(
    await fetch(`${path}/${id}/add-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }),
  );
};

export const postManufacturerRemoveRole = async (
  id: string,
  role: string,
): Promise<ApiSuccessBody<{ id: string }>> => {
  const path = SURFACE_API.manufacturer_detail?.detailPath;
  if (!path) {
    throw new Error("No detail API path for manufacturer_detail");
  }

  return parseResponse<{ id: string }>(
    await fetch(`${path}/${id}/remove-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
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
