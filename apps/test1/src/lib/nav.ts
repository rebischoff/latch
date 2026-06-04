import type { Principal, SurfaceId } from "@latch/contracts";

export type NavItem = {
  href: string;
  label: string;
  key: string;
};

/**
 * Static route catalog. Visibility is policy-driven once Surfaces exist (task 11).
 */
const NAV_CATALOG: readonly {
  href: string;
  label: string;
  surfaceId: SurfaceId;
}[] = [];

export const resolveNavItems = (_principal: Principal): NavItem[] => {
  return NAV_CATALOG.map((entry) => ({
    href: entry.href,
    label: entry.label,
    key: entry.href,
  }));
};
