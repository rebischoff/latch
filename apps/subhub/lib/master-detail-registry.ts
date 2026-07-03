import type { MasterDetailSurfaceConfig } from "@/lib/hooks/use-master-detail-toolbar";
import { routes } from "@/lib/nav-routes";

export const MASTER_DETAIL_SURFACES = {
  sites: {
    listRoute: routes.sites.list,
    newPath: routes.sites.new,
    detailSurfaceId: "site_detail",
    createGate: "write",
  },
  parts: {
    listRoute: routes.parts.list,
    newPath: routes.parts.new,
    detailSurfaceId: "part_detail",
    createGate: "write",
  },
  jobs: {
    listRoute: routes.jobs.list,
    newPath: routes.jobs.new,
    detailSurfaceId: "job_detail",
    createGate: "write",
  },
  estimates: {
    listRoute: routes.estimates.list,
    newPath: routes.estimates.new,
    detailSurfaceId: "estimate_detail",
    createGate: "write",
  },
  employees: {
    listRoute: routes.employees.list,
    newPath: routes.employees.new,
    detailSurfaceId: "employee_detail",
    createGate: "write",
  },
  manufacturers: {
    listRoute: routes.manufacturers.list,
    newPath: routes.manufacturers.new,
    detailSurfaceId: "manufacturer_detail",
    createGate: "write",
  },
  categories: {
    listRoute: routes.categories.list,
    newPath: routes.categories.new,
    detailSurfaceId: "category_detail",
    createGate: "create",
    createManifestSurfaceId: "category_list",
    create: { variant: "category", trigger: "hover" as const },
  },
} as const satisfies Record<string, MasterDetailSurfaceConfig>;
