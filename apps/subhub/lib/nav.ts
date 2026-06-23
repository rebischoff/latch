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
  | "site"
  | "relation"
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
    label: "Contact relations",
    group: "Sites",
    icon: "relation",
  },
];
