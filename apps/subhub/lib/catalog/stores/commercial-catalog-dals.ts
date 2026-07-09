import { createSurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import {
  ComplexityFactorTableCreateSchema,
  complexityFactorTableDescriptor,
  CostAddOnTableCreateSchema,
  freightRateTypeTableDescriptor,
  incidentalRateTypeTableDescriptor,
  laborPhaseTableDescriptor,
  LaborPhaseTableCreateSchema,
  laborRateTypeTableDescriptor,
  LaborRateTypeTableCreateSchema,
  markupTypeTableDescriptor,
  MarkupTypeTableCreateSchema,
  mapComplexityCreateBody,
  mapComplexityReplaceBody,
  mapCostAddOnCreateBody,
  mapCostAddOnReplaceBody,
  mapLaborRateCreateBody,
  mapLaborRateReplaceBody,
  mapMarkupCreateBody,
  mapMarkupReplaceBody,
  mapNameCreateBody,
  mapNameReplaceBody,
  mapSpecUnitCreateBody,
  mapSpecUnitReplaceBody,
  specUnitTableDescriptor,
  SpecUnitTableCreateSchema,
} from "../descriptors/commercial-catalog-tables";
import {
  insertComplexityFactor,
  insertFreightRateType,
  insertIncidentalRateType,
  insertLaborPhase,
  insertLaborRateType,
  insertMarkupType,
  loadComplexityFactorList,
  loadFreightRateTypeList,
  loadIncidentalRateTypeList,
  loadLaborPhaseList,
  loadLaborRateTypeList,
  loadMarkupTypeList,
  replaceComplexityFactors,
  replaceFreightRateTypes,
  replaceIncidentalRateTypes,
  replaceLaborPhases,
  replaceLaborRateTypes,
  replaceMarkupTypes,
} from "../repository/commercial-catalogs";
import {
  insertSpecUnit,
  loadSpecUnitList,
  replaceSpecUnits,
} from "../repository/spec-units";
import { createLaborRateTypeTableStore } from "../../../modules/catalog/generated/labor_rate_type_table.store.generated";
import { createLaborPhaseTableStore } from "../../../modules/catalog/generated/labor_phase_table.store.generated";
import { createComplexityFactorTableStore } from "../../../modules/catalog/generated/complexity_factor_table.store.generated";
import { createMarkupTypeTableStore } from "../../../modules/catalog/generated/markup_type_table.store.generated";
import { createFreightRateTypeTableStore } from "../../../modules/catalog/generated/freight_rate_type_table.store.generated";
import { createIncidentalRateTypeTableStore } from "../../../modules/catalog/generated/incidental_rate_type_table.store.generated";
import { createSpecUnitTableStore } from "../../../modules/catalog/generated/spec_unit_table.store.generated";
import { extendCatalogTableDal } from "./catalog-table-dal";

export const createCommercialCatalogDals = (
  pool: Pool,
  getActorId: () => Promise<string>,
) => ({
  laborRateTypeTable: extendCatalogTableDal(
    pool,
    getActorId,
    createSurfaceDal(
      laborRateTypeTableDescriptor,
      createLaborRateTypeTableStore(pool, getActorId),
    ),
    {
      createSchema: LaborRateTypeTableCreateSchema,
      descriptor: laborRateTypeTableDescriptor,
      listRows: () => loadLaborRateTypeList(pool),
      insertRow: insertLaborRateType,
      replaceRows: replaceLaborRateTypes,
      mapCreateBody: mapLaborRateCreateBody,
      mapReplaceBody: mapLaborRateReplaceBody,
    },
  ),
  laborPhaseTable: extendCatalogTableDal(
    pool,
    getActorId,
    createSurfaceDal(laborPhaseTableDescriptor, createLaborPhaseTableStore(pool, getActorId)),
    {
      createSchema: LaborPhaseTableCreateSchema,
      descriptor: laborPhaseTableDescriptor,
      listRows: () => loadLaborPhaseList(pool),
      insertRow: insertLaborPhase,
      replaceRows: replaceLaborPhases,
      mapCreateBody: mapNameCreateBody,
      mapReplaceBody: mapNameReplaceBody,
    },
  ),
  complexityFactorTable: extendCatalogTableDal(
    pool,
    getActorId,
    createSurfaceDal(
      complexityFactorTableDescriptor,
      createComplexityFactorTableStore(pool, getActorId),
    ),
    {
      createSchema: ComplexityFactorTableCreateSchema,
      descriptor: complexityFactorTableDescriptor,
      listRows: () => loadComplexityFactorList(pool),
      insertRow: insertComplexityFactor,
      replaceRows: replaceComplexityFactors,
      mapCreateBody: mapComplexityCreateBody,
      mapReplaceBody: mapComplexityReplaceBody,
    },
  ),
  markupTypeTable: extendCatalogTableDal(
    pool,
    getActorId,
    createSurfaceDal(markupTypeTableDescriptor, createMarkupTypeTableStore(pool, getActorId)),
    {
      createSchema: MarkupTypeTableCreateSchema,
      descriptor: markupTypeTableDescriptor,
      listRows: () => loadMarkupTypeList(pool),
      insertRow: insertMarkupType,
      replaceRows: replaceMarkupTypes,
      mapCreateBody: mapMarkupCreateBody,
      mapReplaceBody: mapMarkupReplaceBody,
    },
  ),
  freightRateTypeTable: extendCatalogTableDal(
    pool,
    getActorId,
    createSurfaceDal(
      freightRateTypeTableDescriptor,
      createFreightRateTypeTableStore(pool, getActorId),
    ),
    {
      createSchema: CostAddOnTableCreateSchema,
      descriptor: freightRateTypeTableDescriptor,
      listRows: () => loadFreightRateTypeList(pool),
      insertRow: insertFreightRateType,
      replaceRows: replaceFreightRateTypes,
      mapCreateBody: mapCostAddOnCreateBody,
      mapReplaceBody: mapCostAddOnReplaceBody,
    },
  ),
  incidentalRateTypeTable: extendCatalogTableDal(
    pool,
    getActorId,
    createSurfaceDal(
      incidentalRateTypeTableDescriptor,
      createIncidentalRateTypeTableStore(pool, getActorId),
    ),
    {
      createSchema: CostAddOnTableCreateSchema,
      descriptor: incidentalRateTypeTableDescriptor,
      listRows: () => loadIncidentalRateTypeList(pool),
      insertRow: insertIncidentalRateType,
      replaceRows: replaceIncidentalRateTypes,
      mapCreateBody: mapCostAddOnCreateBody,
      mapReplaceBody: mapCostAddOnReplaceBody,
    },
  ),
  specUnitTable: extendCatalogTableDal(
    pool,
    getActorId,
    createSurfaceDal(specUnitTableDescriptor, createSpecUnitTableStore(pool, getActorId)),
    {
      createSchema: SpecUnitTableCreateSchema,
      descriptor: specUnitTableDescriptor,
      listRows: () => loadSpecUnitList(pool),
      insertRow: insertSpecUnit,
      replaceRows: replaceSpecUnits,
      mapCreateBody: mapSpecUnitCreateBody,
      mapReplaceBody: mapSpecUnitReplaceBody,
    },
  ),
});

export type CommercialCatalogDals = ReturnType<typeof createCommercialCatalogDals>;
