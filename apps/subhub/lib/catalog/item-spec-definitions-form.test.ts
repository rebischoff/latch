import { describe, expect, it } from "vitest";

import {
  toSpecDefinitionPatchRow,
  type SpecDefinitionFormRow,
} from "./item-spec-definitions-form";

const enumRow = (): SpecDefinitionFormRow => ({
  id: "def-1",
  display_name: "Finish",
  value_type: "enum",
  unit_id: null,
  decimal_places: null,
  sort_order: 1,
  options: [
    { id: "opt-1", display_name: "Matte", sort_order: 1 },
    { id: "opt-2", display_name: "Gloss", sort_order: 2 },
  ],
});

const numberRow = (): SpecDefinitionFormRow => ({
  id: "def-2",
  display_name: "Capacity",
  value_type: "number",
  unit_id: "unit-tons",
  decimal_places: 2,
  sort_order: 2,
  options: [],
});

describe("toSpecDefinitionPatchRow", () => {
  it("keeps enum options and clears number-only fields", () => {
    const row = enumRow();
    row.unit_id = "stale-unit";
    row.decimal_places = 4;

    expect(toSpecDefinitionPatchRow(row, 0)).toEqual({
      id: "def-1",
      display_name: "Finish",
      value_type: "enum",
      unit_id: null,
      decimal_places: null,
      sort_order: 1,
      options: [
        { id: "opt-1", display_name: "Matte", sort_order: 1 },
        { id: "opt-2", display_name: "Gloss", sort_order: 2 },
      ],
    });
  });

  it("keeps number unit/dp and strips leftover options (forward type change)", () => {
    const row = numberRow();
    row.options = [{ id: "opt-x", display_name: "orphan", sort_order: 1 }];

    expect(toSpecDefinitionPatchRow(row, 1)).toEqual({
      id: "def-2",
      display_name: "Capacity",
      value_type: "number",
      unit_id: "unit-tons",
      decimal_places: 2,
      sort_order: 2,
      options: [],
    });
  });

  it("strips both options and unit fields for boolean", () => {
    const row: SpecDefinitionFormRow = {
      ...enumRow(),
      value_type: "boolean",
      unit_id: "stale-unit",
      decimal_places: 1,
    };

    expect(toSpecDefinitionPatchRow(row, 0)).toEqual({
      id: "def-1",
      display_name: "Finish",
      value_type: "boolean",
      unit_id: null,
      decimal_places: null,
      sort_order: 1,
      options: [],
    });
  });

  it("round-trip before save: form retains Details; patch uses active type only", () => {
    // Simulate Approach B: Type onChange does not clear form fields.
    const form = enumRow();
    form.value_type = "boolean";
    expect(toSpecDefinitionPatchRow(form, 0).options).toEqual([]);
    expect(form.options).toHaveLength(2);

    form.value_type = "enum";
    expect(toSpecDefinitionPatchRow(form, 0).options).toEqual([
      { id: "opt-1", display_name: "Matte", sort_order: 1 },
      { id: "opt-2", display_name: "Gloss", sort_order: 2 },
    ]);

    const numberForm = numberRow();
    numberForm.value_type = "enum";
    numberForm.options = [{ display_name: "A", sort_order: 1 }];
    expect(toSpecDefinitionPatchRow(numberForm, 0)).toMatchObject({
      value_type: "enum",
      unit_id: null,
      decimal_places: null,
      options: [{ display_name: "A", sort_order: 1 }],
    });
    expect(numberForm.unit_id).toBe("unit-tons");
    expect(numberForm.decimal_places).toBe(2);

    numberForm.value_type = "number";
    expect(toSpecDefinitionPatchRow(numberForm, 0)).toMatchObject({
      value_type: "number",
      unit_id: "unit-tons",
      decimal_places: 2,
      options: [],
    });
  });
});
