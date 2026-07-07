import { createCatalogTableRouteHandlers } from "../../../../lib/catalog/catalog-table-route-handlers";

const handlers = createCatalogTableRouteHandlers(
  "complexity_factor_table",
  "complexityFactorTable",
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
