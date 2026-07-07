import { createCatalogTableRouteHandlers } from "../../../../lib/catalog/catalog-table-route-handlers";

const handlers = createCatalogTableRouteHandlers(
  "labor_rate_type_table",
  "laborRateTypeTable",
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
