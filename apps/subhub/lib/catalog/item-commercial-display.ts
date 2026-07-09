import type { ItemTreeNode } from "./descriptors/item-list";

export type CommercialFamily = "freight" | "incidental" | "markup";

export type ItemCommercialIndexRow = {
  freight_rate_type_id: string | null;
  id: string;
  incidental_rate_type_id: string | null;
  markup_type_id: string | null;
  parent_id: string | null;
};

const familyField: Record<
  CommercialFamily,
  keyof Pick<
    ItemCommercialIndexRow,
    "freight_rate_type_id" | "incidental_rate_type_id" | "markup_type_id"
  >
> = {
  freight: "freight_rate_type_id",
  incidental: "incidental_rate_type_id",
  markup: "markup_type_id",
};

export const formatPercentValue = (value: number): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  return Number.isInteger(numeric) ? `${numeric}%` : `${numeric.toFixed(2)}%`;
};

export const formatAddOnRateSummary = (
  percent: number,
  amountCents: number,
): string | null => {
  const parts: string[] = [];
  const percentLabel = formatPercentValue(percent);
  if (percentLabel) {
    parts.push(percentLabel);
  }

  const amount = Number(amountCents);
  if (Number.isFinite(amount) && amount > 0) {
    parts.push(`$${(amount / 100).toFixed(2)}`);
  }

  return parts.length > 0 ? parts.join(" + ") : null;
};

export const formatMarkupRateSummary = (
  materialMarkupPercent: number,
  laborMarkupPercent: number,
): string | null => {
  const material = Number(materialMarkupPercent);
  const labor = Number(laborMarkupPercent);
  const materialLabel = formatPercentValue(material);
  const laborLabel = formatPercentValue(labor);

  if (materialLabel && laborLabel) {
    if (material === labor) {
      return materialLabel;
    }
    return `M ${materialLabel} + L ${laborLabel}`;
  }

  if (materialLabel) {
    return materialLabel;
  }

  if (laborLabel) {
    return laborLabel;
  }

  return null;
};

export const flattenItemTreeCommercial = (
  nodes: ItemTreeNode[],
): Map<string, ItemCommercialIndexRow> => {
  const index = new Map<string, ItemCommercialIndexRow>();

  const walk = (node: ItemTreeNode) => {
    index.set(node.id, {
      id: node.id,
      parent_id: node.parent_id,
      freight_rate_type_id: node.freight_rate_type_id ?? null,
      incidental_rate_type_id: node.incidental_rate_type_id ?? null,
      markup_type_id: node.markup_type_id ?? null,
    });
    node.children.forEach(walk);
  };

  nodes.forEach(walk);
  return index;
};

export const buildAncestorChain = (
  index: Map<string, ItemCommercialIndexRow>,
  itemId: string | undefined,
  parentId: string | null | undefined,
): string[] => {
  const start =
    itemId && index.has(itemId) ? itemId : parentId && index.has(parentId) ? parentId : null;
  if (!start) {
    return [];
  }

  const chain: string[] = [];
  let current: string | null = start;
  while (current) {
    chain.push(current);
    current = index.get(current)?.parent_id ?? null;
  }

  return chain;
};

export const resolveEffectiveRateTypeId = (
  index: Map<string, ItemCommercialIndexRow>,
  chain: string[],
  family: CommercialFamily,
  selfRateTypeId: string | null | undefined,
): string | null => {
  if (selfRateTypeId) {
    return selfRateTypeId;
  }

  const field = familyField[family];
  for (const id of chain) {
    const value = index.get(id)?.[field];
    if (value) {
      return value;
    }
  }

  return null;
};

export const unwrapCatalogPercent = (row: Record<string, unknown>): number => {
  const field = row.percent as { percent?: number } | undefined;
  return Number(field?.percent ?? 0);
};

export const unwrapCatalogAmountCents = (row: Record<string, unknown>): number => {
  const field = row.amount_cents as { amount_cents?: number } | undefined;
  return Number(field?.amount_cents ?? 0);
};

export const unwrapCatalogMaterialMarkup = (row: Record<string, unknown>): number => {
  const field = row.material_markup_percent as { material_markup_percent?: number } | undefined;
  return Number(field?.material_markup_percent ?? 0);
};

export const unwrapCatalogLaborMarkup = (row: Record<string, unknown>): number => {
  const field = row.labor_markup_percent as { labor_markup_percent?: number } | undefined;
  return Number(field?.labor_markup_percent ?? 0);
};

export const summarizeAddOnCatalogRow = (
  rows: Array<Record<string, unknown>> | undefined,
  rateTypeId: string | null,
): string | null => {
  if (!rateTypeId) {
    return null;
  }

  const row = rows?.find((candidate) => String(candidate.id) === rateTypeId);
  if (!row) {
    return null;
  }

  return formatAddOnRateSummary(
    unwrapCatalogPercent(row),
    unwrapCatalogAmountCents(row),
  );
};

export const summarizeMarkupCatalogRow = (
  rows: Array<Record<string, unknown>> | undefined,
  rateTypeId: string | null,
): string | null => {
  if (!rateTypeId) {
    return null;
  }

  const row = rows?.find((candidate) => String(candidate.id) === rateTypeId);
  if (!row) {
    return null;
  }

  return formatMarkupRateSummary(
    unwrapCatalogMaterialMarkup(row),
    unwrapCatalogLaborMarkup(row),
  );
};
