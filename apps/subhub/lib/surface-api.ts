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
  item_list: { listPath: "/api/items/tree" },
  item_detail: {
    detailPath: "/api/items",
    listSurfaceId: "item_list",
  },
  labor_rate_type_table: {
    listPath: "/api/catalog/labor-rates",
    detailPath: "/api/catalog/labor-rates",
  },
  freight_rate_type_table: {
    listPath: "/api/catalog/freight-rates",
    detailPath: "/api/catalog/freight-rates",
  },
  incidental_rate_type_table: {
    listPath: "/api/catalog/incidental-rates",
    detailPath: "/api/catalog/incidental-rates",
  },
  markup_type_table: {
    listPath: "/api/catalog/markup-types",
    detailPath: "/api/catalog/markup-types",
  },
  complexity_factor_table: {
    listPath: "/api/catalog/complexity-factors",
    detailPath: "/api/catalog/complexity-factors",
  },
  labor_phase_table: {
    listPath: "/api/catalog/labor-phases",
    detailPath: "/api/catalog/labor-phases",
  },
  spec_unit_table: {
    listPath: "/api/catalog/spec-units",
    detailPath: "/api/catalog/spec-units",
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

export type EstimateSiteTreePickerData = {
  site_tree: {
    scopes: Array<{
      id: string;
      name: string;
      root_item_id: string;
      zones: Array<{ id: string; name: string; zones?: unknown[] }>;
    }>;
    spec_templates: Record<
      string,
      Array<{
        def_display_name: string;
        options?: Array<{ display_name: string; id: string }>;
        spec_def_id: string;
        spec_option_id: string | null;
        option_display_name: string | null;
        value_boolean: boolean | null;
        value_number: number | null;
        value_type: "enum" | "boolean" | "number";
      }>
    >;
  };
};

export type ItemTreePickerNode = {
  children?: ItemTreePickerNode[];
  id: string;
  label: string;
  selectable: boolean;
  type: "category" | "item";
  value: string;
};

export type EstimateItemPickerData = {
  tree: ItemTreePickerNode[];
};

export const fetchEstimateItemPicker = async (
  rootItemId: string,
  searchQuery?: string,
): Promise<ApiSuccessBody<EstimateItemPickerData>> => {
  const params = new URLSearchParams({ root_item_id: rootItemId });
  if (searchQuery) {
    params.set("q", searchQuery);
  }
  const response = await fetch(`/api/estimates/pickers/items?${params.toString()}`);
  return parseResponse<EstimateItemPickerData>(response);
};

export type EstimateScopeSpecTemplateRow = {
  decimal_places?: number | null;
  def_display_name: string;
  option_display_name: string | null;
  options?: Array<{ display_name: string; id: string }>;
  spec_def_id: string;
  spec_option_id: string | null;
  to_canonical_factor?: number;
  unit_symbol?: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
  value_type: "enum" | "boolean" | "number";
};

export type EstimateScopeSpecTemplateData = {
  specs: EstimateScopeSpecTemplateRow[];
};

/** Catalog scope-panel defs for a root — seeds Add root condition (not site-scoped). */
export const fetchEstimateScopeSpecTemplate = async (
  rootItemId: string,
): Promise<ApiSuccessBody<EstimateScopeSpecTemplateData>> => {
  const params = new URLSearchParams({ root_item_id: rootItemId });
  const response = await fetch(
    `/api/estimates/pickers/scope-specs?${params.toString()}`,
  );
  return parseResponse<EstimateScopeSpecTemplateData>(response);
};

export type EstimatePartPickerRow = {
  description: string;
  id: string;
  max_vendor_price: number;
  mpn: string;
};

export type EstimatePartPickerData = {
  parts: EstimatePartPickerRow[];
};

export const fetchEstimatePartPicker = async (params: {
  itemId: string;
  estimateConditionId: string;
  estimateId?: string;
  lineId?: string;
}): Promise<ApiSuccessBody<EstimatePartPickerData>> => {
  const search = new URLSearchParams({ item_id: params.itemId });
  if (params.estimateId && params.lineId) {
    search.set("estimate_id", params.estimateId);
    search.set("line_id", params.lineId);
  } else {
    search.set("estimate_condition_id", params.estimateConditionId);
  }
  const response = await fetch(`/api/estimates/pickers/parts?${search.toString()}`);
  return parseResponse<EstimatePartPickerData>(response);
};

export type EstimateLinePreviewLineInput = {
  id: string;
  item_id: string | null;
  part_id?: string | null;
  sales_locked?: boolean;
  material_locked?: boolean;
  quantity?: number;
  unit_price?: number;
  unit_material?: number;
  unit_labor?: number;
  unit_freight?: number;
  unit_incidental?: number;
  unit_cost?: number;
  unit_price_target?: number;
  unit?: string;
  description?: string;
  vendor_part_id?: string | null;
};

export type EstimateLinePreviewConditionDraft = {
  complexity_factor_id?: string | null;
  labor_phases_explicit?: boolean;
  included_labor_phases?: string[];
  specs?: Array<{
    spec_def_id: string;
    spec_option_id?: string | null;
    value_boolean?: boolean | null;
    value_number?: number | null;
  }>;
};

export type EstimateLinePreviewResultLine = {
  id: string;
  part_id: string | null;
  vendor_part_id: string | null;
  unit_material: number;
  unit_freight: number;
  unit_incidental: number;
  unit_labor: number;
  unit_cost: number;
  unit_price_target: number;
  unit_price: number;
};

export type EstimateLinePreviewData = {
  lines: EstimateLinePreviewResultLine[];
};

export const fetchEstimateLinePreview = async (
  estimateId: string,
  body: {
    condition_id: string;
    condition_draft?: EstimateLinePreviewConditionDraft;
    lines: EstimateLinePreviewLineInput[];
  },
): Promise<ApiSuccessBody<EstimateLinePreviewData>> => {
  const response = await fetch(`/api/estimates/${encodeURIComponent(estimateId)}/line-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<EstimateLinePreviewData>(response);
};

export const fetchEstimateSiteTree = async (
  siteId: string,
): Promise<ApiSuccessBody<EstimateSiteTreePickerData>> => {
  const response = await fetch(
    `/api/estimates/pickers/site-tree?site_id=${encodeURIComponent(siteId)}`,
  );
  return parseResponse<EstimateSiteTreePickerData>(response);
};

export type CategoryRootPickerRow = {
  id: string;
  name: string;
  sort_order: number;
};

export type CategoryRootPickerData = {
  rows: CategoryRootPickerRow[];
  total: number;
};

export const fetchItemRootPicker = async (): Promise<
  ApiSuccessBody<CategoryRootPickerData>
> => {
  const response = await fetch("/api/sites/pickers/item-roots");
  return parseResponse<CategoryRootPickerData>(response);
};

export type PartItemTreePickerNode = {
  children?: PartItemTreePickerNode[];
  id: string;
  label: string;
  selectable: boolean;
  type: "node";
  value: string;
};

export type PartItemTreePickerData = {
  tree: PartItemTreePickerNode[];
};

export const fetchPartItemTreePicker = async (
  searchQuery?: string,
): Promise<ApiSuccessBody<PartItemTreePickerData>> => {
  const params = new URLSearchParams();
  if (searchQuery) {
    params.set("q", searchQuery);
  }
  const qs = params.toString();
  const response = await fetch(
    qs ? `/api/parts/pickers/items?${qs}` : "/api/parts/pickers/items",
  );
  return parseResponse<PartItemTreePickerData>(response);
};

export type PartSpecDefPickerRow = {
  code: string;
  decimal_places: number | null;
  display_name: string;
  options: Array<{ id: string; code: string; display_name: string }>;
  spec_def_id: string;
  to_canonical_factor: number;
  unit_symbol: string | null;
  value_type: "boolean" | "enum" | "number";
};

export type PartSpecDefsPickerData = {
  defs: PartSpecDefPickerRow[];
};

export const fetchPartSpecDefsPicker = async (
  itemIds: string[],
): Promise<ApiSuccessBody<PartSpecDefsPickerData>> => {
  const params = new URLSearchParams({ item_ids: itemIds.join(",") });
  const response = await fetch(`/api/parts/pickers/spec-defs?${params.toString()}`);
  return parseResponse<PartSpecDefsPickerData>(response);
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
