import { SURFACE_NAV_CATALOG } from "./nav";

/** Flat page paths — group prefixes (e.g. IAM) are nav-only, not in URLs. */
export const routes = {
  home: "/",
  login: "/login",
  changePasswordRequired: "/change-password-required",
  settings: "/settings",
  users: {
    list: "/users",
    new: "/users/new",
    detail: (id: string) => `/users/${id}`,
  },
  roles: {
    list: "/roles",
    new: "/roles/new",
    detail: (id: string) => `/roles/${id}`,
  },
  contacts: {
    list: "/contacts",
    detail: (id: string) => `/contacts/${id}`,
  },
  customers: {
    list: "/customers",
    detail: (id: string) => `/customers/${id}`,
  },
  propertyOwners: {
    list: "/property-owners",
    detail: (id: string) => `/property-owners/${id}`,
  },
  vendors: {
    list: "/vendors",
    detail: (id: string) => `/vendors/${id}`,
  },
  manufacturers: {
    list: "/manufacturers",
    new: "/manufacturers/new",
    detail: (id: string) => `/manufacturers/${id}`,
  },
  employees: {
    list: "/employees",
    new: "/employees/new",
    detail: (id: string) => `/employees/${id}`,
  },
  sites: {
    list: "/sites",
    new: "/sites/new",
    detail: (id: string) => `/sites/${id}`,
  },
  contactRelations: "/contact-relations",
  partyRelations: "/party-relations",
  estimates: {
    list: "/estimates",
    new: "/estimates/new",
    detail: (id: string) => `/estimates/${id}`,
    demo: "/estimates/demo",
  },
  jobs: {
    list: "/jobs",
    new: "/jobs/new",
    detail: (id: string) => `/jobs/${id}`,
  },
  requisitions: {
    list: "/requisitions",
  },
  purchaseOrders: {
    list: "/purchase-orders",
    detail: (id: string) => `/purchase-orders/${id}`,
  },
  parts: {
    list: "/parts",
    new: "/parts/new",
    detail: (id: string) => `/parts/${id}`,
  },
  items: {
    list: "/items",
    new: "/items/new",
    detail: (id: string) => `/items/${id}`,
  },
  laborRates: "/labor-rates",
  freightRates: "/freight-rates",
  incidentalRates: "/incidental-rates",
  markupTypes: "/markup-types",
  complexityFactors: "/complexity-factors",
  laborPhases: "/labor-phases",
  specUnits: "/spec-units",
} as const;

const navMatchPrefixes = [
  ...SURFACE_NAV_CATALOG.map((entry) => entry.navKey),
  routes.home,
] as string[];

/**
 * Map a pathname to the sidebar `selectedKeys` entry.
 * Uses longest-prefix match so `/users/[id]` highlights Users.
 */
export const navSelectionKeyForPath = (pathname: string): string | undefined =>
  [...navMatchPrefixes]
    .sort((a, b) => b.length - a.length)
    .find(
      (prefix) =>
        pathname === prefix || (prefix !== "/" && pathname.startsWith(`${prefix}/`)),
    );
