import { SURFACE_NAV_CATALOG } from "./nav";

/** Flat page paths — group prefixes (e.g. IAM) are nav-only, not in URLs. */
export const routes = {
  home: "/",
  login: "/login",
  settings: "/settings",
  users: {
    list: "/users",
    detail: (id: string) => `/users/${id}`,
  },
  roles: {
    list: "/roles",
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
  sites: {
    list: "/sites",
    detail: (id: string) => `/sites/${id}`,
  },
  contactRelations: "/contact-relations",
  estimates: {
    demo: "/estimates/demo",
  },
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
