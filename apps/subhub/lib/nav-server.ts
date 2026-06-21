import { readableFieldIds, surfaceAllows, type Manifest } from "@latch/contracts";

import { getPrincipal, resolveContext } from "./latch";
import { subhubRegistry } from "./policy-registry";
import {
  NAV_CHROME,
  SURFACE_NAV_CATALOG,
  type NavGroupEntry,
  type NavItem,
  type NavItemEntry,
} from "./nav";

type NavGroupsCache = {
  principalId: string;
  policyVersion: number | undefined;
  groups: NavGroupEntry[];
};

let navGroupsCache: NavGroupsCache | undefined;

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
  let principal;
  try {
    principal = await getPrincipal();
  } catch {
    return [];
  }

  if (
    navGroupsCache &&
    navGroupsCache.principalId === principal.id &&
    navGroupsCache.policyVersion === principal.policyVersion
  ) {
    return navGroupsCache.groups;
  }

  const childrenByGroup = new Map<string, NavItemEntry[]>();

  for (const entry of SURFACE_NAV_CATALOG) {
    if (!(entry.surfaceId in subhubRegistry)) {
      continue;
    }

    const { manifest } = await resolveContext({ surfaceId: entry.surfaceId });
    const visible = surfaceNavVisible(manifest);

    if (!visible) {
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

  const groups = [...childrenByGroup.entries()].map(([label, children]) => ({
    type: "group" as const,
    key: `group:${label}`,
    label,
    children,
  }));
  navGroupsCache = {
    principalId: principal.id,
    policyVersion: principal.policyVersion,
    groups,
  };
  return groups;
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
