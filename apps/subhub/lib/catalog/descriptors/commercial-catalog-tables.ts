import { z } from "zod";

export {
  laborRateTypeTableDescriptor,
  type LaborRateTypeTableRow,
} from "../../../modules/catalog/generated/labor_rate_type_table.glue.generated";

export {
  laborPhaseTableDescriptor,
  type LaborPhaseTableRow,
} from "../../../modules/catalog/generated/labor_phase_table.glue.generated";

export {
  complexityFactorTableDescriptor,
  type ComplexityFactorTableRow,
} from "../../../modules/catalog/generated/complexity_factor_table.glue.generated";

export {
  markupTypeTableDescriptor,
  type MarkupTypeTableRow,
} from "../../../modules/catalog/generated/markup_type_table.glue.generated";

export {
  freightRateTypeTableDescriptor,
  type FreightRateTypeTableRow,
} from "../../../modules/catalog/generated/freight_rate_type_table.glue.generated";

export {
  incidentalRateTypeTableDescriptor,
  type IncidentalRateTypeTableRow,
} from "../../../modules/catalog/generated/incidental_rate_type_table.glue.generated";

const nameField = z.object({ name: z.string().min(1) }).strict();

export const LaborRateTypeTableCreateSchema = z
  .object({
    name: nameField,
    rate_cents: z.object({ rate_cents: z.number().int() }).strict().optional(),
    sort_order: z.object({ sort_order: z.number().int() }).strict().optional(),
  })
  .strict();

export const LaborRateTypeTableReplaceSchema = z
  .object({
    rows: z.array(
      z
        .object({
          id: z.string().optional(),
          name: z.string().min(1),
          rate_cents: z.number().int().optional(),
        })
        .strict(),
    ),
  })
  .strict();

export const LaborPhaseTableCreateSchema = z
  .object({
    name: nameField,
    sort_order: z.object({ sort_order: z.number().int() }).strict().optional(),
  })
  .strict();

export const LaborPhaseTableReplaceSchema = z
  .object({
    rows: z.array(
      z.object({ id: z.string().optional(), name: z.string().min(1) }).strict(),
    ),
  })
  .strict();

export const ComplexityFactorTableCreateSchema = z
  .object({
    name: nameField,
    factor_percent: z
      .object({ factor_percent: z.number() })
      .strict()
      .optional(),
    sort_order: z.object({ sort_order: z.number().int() }).strict().optional(),
  })
  .strict();

export const ComplexityFactorTableReplaceSchema = z
  .object({
    rows: z.array(
      z
        .object({
          id: z.string().optional(),
          name: z.string().min(1),
          factor_percent: z.number().optional(),
        })
        .strict(),
    ),
  })
  .strict();

export const MarkupTypeTableCreateSchema = z
  .object({
    name: nameField,
    material_markup_percent: z
      .object({ material_markup_percent: z.number() })
      .strict()
      .optional(),
    labor_markup_percent: z
      .object({ labor_markup_percent: z.number() })
      .strict()
      .optional(),
    sort_order: z.object({ sort_order: z.number().int() }).strict().optional(),
  })
  .strict();

export const MarkupTypeTableReplaceSchema = z
  .object({
    rows: z.array(
      z
        .object({
          id: z.string().optional(),
          name: z.string().min(1),
          material_markup_percent: z.number().optional(),
          labor_markup_percent: z.number().optional(),
        })
        .strict(),
    ),
  })
  .strict();

export const CostAddOnTableCreateSchema = z
  .object({
    name: nameField,
    percent: z.object({ percent: z.number() }).strict().optional(),
    amount_cents: z.object({ amount_cents: z.number().int() }).strict().optional(),
    sort_order: z.object({ sort_order: z.number().int() }).strict().optional(),
  })
  .strict();

export const CostAddOnTableReplaceSchema = z
  .object({
    rows: z.array(
      z
        .object({
          id: z.string().optional(),
          name: z.string().min(1),
          percent: z.number().optional(),
          amount_cents: z.number().int().optional(),
        })
        .strict(),
    ),
  })
  .strict();

export const mapNameCreateBody = (body: unknown): Record<string, unknown> => {
  const parsed = z
    .object({ name: z.object({ name: z.string() }).strict() })
    .strict()
    .parse(body);
  return { name: parsed.name.name };
};

export const mapNameReplaceBody = (body: unknown): Array<Record<string, unknown>> => {
  const parsed = z
    .object({
      rows: z.array(
        z.object({ id: z.string().optional(), name: z.string() }).strict(),
      ),
    })
    .strict()
    .parse(body);
  return parsed.rows;
};

export const mapLaborRateCreateBody = (body: unknown): Record<string, unknown> => {
  const parsed = LaborRateTypeTableCreateSchema.parse(body);
  return {
    name: parsed.name.name,
    rate_cents: parsed.rate_cents?.rate_cents ?? 0,
    sort_order: parsed.sort_order?.sort_order ?? 0,
  };
};

export const mapLaborRateReplaceBody = (
  body: unknown,
): Array<Record<string, unknown>> =>
  LaborRateTypeTableReplaceSchema.parse(body).rows.map((row) => ({
    id: row.id,
    name: row.name,
    rate_cents: row.rate_cents ?? 0,
  }));

export const mapComplexityCreateBody = (body: unknown): Record<string, unknown> => {
  const parsed = ComplexityFactorTableCreateSchema.parse(body);
  return {
    name: parsed.name.name,
    factor_percent: parsed.factor_percent?.factor_percent ?? 100,
    sort_order: parsed.sort_order?.sort_order ?? 0,
  };
};

export const mapComplexityReplaceBody = (
  body: unknown,
): Array<Record<string, unknown>> =>
  ComplexityFactorTableReplaceSchema.parse(body).rows.map((row) => ({
    id: row.id,
    name: row.name,
    factor_percent: row.factor_percent ?? 100,
  }));

export const mapMarkupCreateBody = (body: unknown): Record<string, unknown> => {
  const parsed = MarkupTypeTableCreateSchema.parse(body);
  return {
    name: parsed.name.name,
    material_markup_percent: parsed.material_markup_percent?.material_markup_percent ?? 0,
    labor_markup_percent: parsed.labor_markup_percent?.labor_markup_percent ?? 0,
    sort_order: parsed.sort_order?.sort_order ?? 0,
  };
};

export const mapMarkupReplaceBody = (
  body: unknown,
): Array<Record<string, unknown>> =>
  MarkupTypeTableReplaceSchema.parse(body).rows.map((row) => ({
    id: row.id,
    name: row.name,
    material_markup_percent: row.material_markup_percent ?? 0,
    labor_markup_percent: row.labor_markup_percent ?? 0,
  }));

export const mapCostAddOnCreateBody = (body: unknown): Record<string, unknown> => {
  const parsed = CostAddOnTableCreateSchema.parse(body);
  return {
    name: parsed.name.name,
    percent: parsed.percent?.percent ?? 0,
    amount_cents: parsed.amount_cents?.amount_cents ?? 0,
    sort_order: parsed.sort_order?.sort_order ?? 0,
  };
};

export const mapCostAddOnReplaceBody = (
  body: unknown,
): Array<Record<string, unknown>> =>
  CostAddOnTableReplaceSchema.parse(body).rows.map((row) => ({
    id: row.id,
    name: row.name,
    percent: row.percent ?? 0,
    amount_cents: row.amount_cents ?? 0,
  }));
