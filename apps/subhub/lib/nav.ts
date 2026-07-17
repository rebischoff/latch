import type { SurfaceId } from "@latch/contracts";

/** Serializable icon key — mapped to Ant Design icons in shell components. */
export type NavIcon =
  | "home"
  | "setting"
  | "user"
  | "team"
  | "contacts"
  | "customer"
  | "vendor"
  | "manufacturer"
  | "site"
  | "relation"
  | "estimate"
  | "job"
  | "part"
  | "category"
  | "menu"
  | "login"
  | "logout";

export type NavChromeKind = "public";

export type NavChromeEntry = {
  kind: NavChromeKind;
  href: string;
  label: string;
  icon: NavIcon;
};

export type SurfaceNavEntry = {
  surfaceId: SurfaceId;
  /** Flat page URL — no group prefix (e.g. `/users`, not `/iam/users`). */
  href: string;
  /** Sidebar selection prefix; defaults to `href` when omitted. */
  navKey: string;
  label: string;
  group: string;
  icon: NavIcon;
};

export type NavItemEntry = {
  type: "item";
  key: string;
  href: string;
  label: string;
  icon?: NavIcon;
};

export type NavDividerEntry = {
  type: "divider";
  key: string;
};

export type NavGroupEntry = {
  type: "group";
  key: string;
  label: string;
  children: NavItemEntry[];
};

export type NavItem = NavItemEntry | NavDividerEntry | NavGroupEntry;

export type HeaderMenuKind = "public" | "session";

export type HeaderMenuEntry = {
  kind: HeaderMenuKind;
  key: string;
  label: string;
  icon: NavIcon;
  href?: string;
  action?: "logout";
};

/** Sidebar chrome — public routes only; not Latch Surfaces. */
export const NAV_CHROME: NavChromeEntry[] = [
  { kind: "public", href: "/", label: "Home", icon: "home" },
];

/**
 * App header dropdown — session utilities, not sidebar Surfaces.
 * Shown in `UserMenu` (top-right), not `SideNav`.
 */
export const HEADER_MENU: HeaderMenuEntry[] = [
  {
    kind: "public",
    key: "login",
    label: "Login",
    icon: "login",
    href: "/login",
  },
  {
    kind: "session",
    key: "settings",
    label: "Settings",
    icon: "setting",
    href: "/settings",
  },
  {
    kind: "session",
    key: "logout",
    label: "Sign out",
    icon: "logout",
    action: "logout",
  },
];

/**
 * Surface catalog — explicit flat hrefs per route tree.
 * `group` is nav-only (sidebar grouping); filtered server-side in `nav-server.ts`.
 */
export const SURFACE_NAV_CATALOG: SurfaceNavEntry[] = [
  {
    surfaceId: "user_list",
    href: "/users",
    navKey: "/users",
    label: "Users",
    group: "IAM",
    icon: "user",
  },
  {
    surfaceId: "role_list",
    href: "/roles",
    navKey: "/roles",
    label: "Roles",
    group: "IAM",
    icon: "team",
  },
  {
    surfaceId: "contact_list",
    href: "/contacts",
    navKey: "/contacts",
    label: "Contacts",
    group: "Contacts",
    icon: "contacts",
  },
  {
    surfaceId: "customer_list",
    href: "/customers",
    navKey: "/customers",
    label: "Customers",
    group: "Contacts",
    icon: "customer",
  },
  {
    surfaceId: "vendor_list",
    href: "/vendors",
    navKey: "/vendors",
    label: "Vendors",
    group: "Contacts",
    icon: "vendor",
  },
  {
    surfaceId: "manufacturer_list",
    href: "/manufacturers",
    navKey: "/manufacturers",
    label: "Manufacturers",
    group: "Contacts",
    icon: "manufacturer",
  },
  {
    surfaceId: "employee_list",
    href: "/employees",
    navKey: "/employees",
    label: "Employees",
    group: "Contacts",
    icon: "team",
  },
  {
    surfaceId: "site_list",
    href: "/sites",
    navKey: "/sites",
    label: "Sites",
    group: "Sites",
    icon: "site",
  },
  {
    surfaceId: "site_contact_relation_table",
    href: "/contact-relations",
    navKey: "/contact-relations",
    label: "Site relations",
    group: "Sites",
    icon: "relation",
  },
  {
    surfaceId: "estimate_list",
    href: "/estimates",
    navKey: "/estimates",
    label: "Estimates",
    group: "Sales",
    icon: "estimate",
  },
  {
    surfaceId: "job_list",
    href: "/jobs",
    navKey: "/jobs",
    label: "Jobs",
    group: "Operations",
    icon: "job",
  },
  {
    surfaceId: "requested_order_list",
    href: "/requisitions",
    navKey: "/requisitions",
    label: "Requisitions",
    group: "Procurement",
    icon: "job",
  },
  {
    surfaceId: "part_list",
    href: "/parts",
    navKey: "/parts",
    label: "Parts",
    group: "Catalog",
    icon: "part",
  },
  {
    surfaceId: "item_list",
    href: "/items",
    navKey: "/items",
    label: "Items",
    group: "Catalog",
    icon: "category",
  },
  {
    surfaceId: "labor_rate_type_table",
    href: "/labor-rates",
    navKey: "/labor-rates",
    label: "Labor rates",
    group: "Catalog",
    icon: "part",
  },
  {
    surfaceId: "freight_rate_type_table",
    href: "/freight-rates",
    navKey: "/freight-rates",
    label: "Freight rates",
    group: "Catalog",
    icon: "part",
  },
  {
    surfaceId: "incidental_rate_type_table",
    href: "/incidental-rates",
    navKey: "/incidental-rates",
    label: "Incidental rates",
    group: "Catalog",
    icon: "part",
  },
  {
    surfaceId: "markup_type_table",
    href: "/markup-types",
    navKey: "/markup-types",
    label: "Markup types",
    group: "Catalog",
    icon: "part",
  },
  {
    surfaceId: "complexity_factor_table",
    href: "/complexity-factors",
    navKey: "/complexity-factors",
    label: "Complexity factors",
    group: "Catalog",
    icon: "part",
  },
  {
    surfaceId: "labor_phase_table",
    href: "/labor-phases",
    navKey: "/labor-phases",
    label: "Labor phases",
    group: "Catalog",
    icon: "part",
  },
  {
    surfaceId: "spec_unit_table",
    href: "/spec-units",
    navKey: "/spec-units",
    label: "Spec units",
    group: "Catalog",
    icon: "part",
  },
];
