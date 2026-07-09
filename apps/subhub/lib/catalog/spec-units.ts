export type SpecUnitRow = {
  canonical_unit_id: string | null;
  dimension: string;
  id: string;
  name: string;
  sort_order: number;
  symbol: string;
  to_canonical_factor: number;
};

/** Multiply an authored value into canonical storage units. */
export const toCanonical = (
  value: number,
  unit: Pick<SpecUnitRow, "to_canonical_factor">,
): number => value * unit.to_canonical_factor;

/** Convert a canonical stored value back to the def's display unit. */
export const fromCanonical = (
  canonical: number,
  unit: Pick<SpecUnitRow, "to_canonical_factor">,
): number => canonical / unit.to_canonical_factor;

/** Format a canonical number for display using the def unit and optional decimal places. */
export const formatSpecNumber = (
  canonical: number,
  unit: Pick<SpecUnitRow, "symbol" | "to_canonical_factor">,
  decimalPlaces: number | null | undefined,
): string => {
  const display = fromCanonical(canonical, unit);
  const formatted =
    decimalPlaces != null ? display.toFixed(decimalPlaces) : String(display);
  return `${formatted} ${unit.symbol}`;
};

export type SpecUnitDisplayMeta = {
  decimal_places?: number | null;
  to_canonical_factor?: number;
  unit_symbol?: string | null;
};

const unitFactor = (unit: SpecUnitDisplayMeta): number => unit.to_canonical_factor ?? 1;

/** Convert a stored canonical value to the def's display unit for form inputs. */
export const specValueToDisplay = (
  canonical: number | null | undefined,
  unit: SpecUnitDisplayMeta,
): number | null => {
  if (canonical === null || canonical === undefined) {
    return null;
  }

  return fromCanonical(canonical, { to_canonical_factor: unitFactor(unit) });
};

/** Convert an authored display value to canonical storage units. */
export const specValueToCanonical = (
  display: number | null | undefined,
  unit: SpecUnitDisplayMeta,
): number | null => {
  if (display === null || display === undefined) {
    return null;
  }

  return toCanonical(display, { to_canonical_factor: unitFactor(unit) });
};
