import type { Principal, SurfaceId } from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { jobPolicyRegistry } from "./policy/registry.js";

const policyService = new PolicyService({ registry: jobPolicyRegistry });

export type NavItem = {
  href: string;
  label: string;
  key: string;
};

/**
 * CRM route catalog (UI routes only). Visibility is policy-driven:
 * `navManifestScope: minimal` — omit routes the principal cannot `read`.
 */
const CRM_NAV_CATALOG = [
  { href: "/jobs", label: "Jobs", surfaceId: "job_detail" as SurfaceId },
  {
    href: "/customers",
    label: "Customers",
    surfaceId: "customer_detail" as SurfaceId,
  },
] as const;

const navResolveMode = (surfaceId: SurfaceId): "list" | "detail" =>
  surfaceId === "customer_detail" ? "detail" : "list";

const surfaceAllowsNav = (
  principal: Principal,
  surfaceId: SurfaceId,
): boolean => {
  try {
    const manifest = policyService.resolve(principal, {
      surface: surfaceId,
      mode: navResolveMode(surfaceId),
    });
    return manifest.actions.includes("read");
  } catch {
    return false;
  }
};

export const resolveNavItems = (principal: Principal): NavItem[] => {
  return CRM_NAV_CATALOG.filter((entry) =>
    surfaceAllowsNav(principal, entry.surfaceId),
  ).map((entry) => ({
    href: entry.href,
    label: entry.label,
    key: entry.href,
  }));
};
