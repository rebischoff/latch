import { readableFieldIds, surfaceAllows, type Manifest } from "@latch/contracts";

import { resolveContext } from "./latch";
import { subhubRegistry } from "./policy-registry";
import {
  NAV_CHROME,
  SURFACE_NAV_CATALOG,
  type NavGroupEntry,
  type NavItem,
  type NavItemEntry,
} from "./nav";

const surfaceNavVisible = (manifest: Manifest): boolean =>
  surfaceAllows(manifest, "read") || readableFieldIds(manifest).length > 0;

const chromeItems = (): NavItemEntry[] =>
  NAV_CHROME.map((entry) => ({
    type: "item",
    key: entry.href,
    href: entry.href,
    label: entry.label,
    icon: entry.icon,
  }));

const visibleSurfaceGroups = async (): Promise<NavGroupEntry[]> => {
  const childrenByGroup = new Map<string, NavItemEntry[]>();

  for (const entry of SURFACE_NAV_CATALOG) {
    if (!(entry.surfaceId in subhubRegistry)) {
      continue;
    }

    const { manifest } = await resolveContext({ surfaceId: entry.surfaceId });

    if (!surfaceNavVisible(manifest)) {
      continue;
    }

    const groupChildren = childrenByGroup.get(entry.group) ?? [];
    groupChildren.push({
      type: "item",
      key: entry.navKey,
      href: entry.href,
      label: entry.label,
      icon: entry.icon,
    });
    childrenByGroup.set(entry.group, groupChildren);
  }

  return [...childrenByGroup.entries()].map(([label, children]) => ({
    type: "group",
    key: `group:${label}`,
    label,
    children,
  }));
};

/** Server-resolved sidebar tree for `SideNav`. */
export const getNavItems = async (authenticated: boolean): Promise<NavItem[]> => {
  const items: NavItem[] = chromeItems();

  if (!authenticated) {
    return items;
  }

  const groups = await visibleSurfaceGroups();

  if (groups.length > 0) {
    items.push({ type: "divider", key: "nav-surface-divider" });
    items.push(...groups);
  }

  return items;
};
