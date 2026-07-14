import { describe, expect, it } from "vitest";

import { projectItemDetailRow } from "../descriptors/item-detail";
import type { ItemDetailRow, ItemDetailRelated } from "../descriptors/item-detail";

const baseRow: ItemDetailRow = {
  id: "leaf-1",
  name: "Notification appliance",
  parent_id: "cat-1",
  parent_name: "Category",
  node_type: "item",
  sort_order: 1,
  csi_code: null,
  fallback_unit_cost: 0,
  freight_rate_type_id: null,
  incidental_rate_type_id: null,
  markup_type_id: null,
  is_root: false,
  root_item_id: "fa-root",
  root_item_name: "Fire Alarm",
  has_children: false,
  in_use: false,
};

const related: ItemDetailRelated = {
  item_labor_phase: [],
  resolved_labor_phase: [],
  spec_definitions: [],
};

describe("projectItemDetailRow", () => {
  it("omits spec_participation from leaf item DTO", () => {
    const dto = projectItemDetailRow(baseRow, {
      surface: "item_detail",
      actions: ["read", "write"],
      fields: {
        profile: ["read"],
        commercial: ["read"],
        item_labor_phase: ["read"],
        spec_definitions: ["read"],
      },
    }, related);

    expect(dto).not.toHaveProperty("spec_participation");
  });

  it("omits in_use_participation_count from spec_definitions rows", () => {
    const dto = projectItemDetailRow(
      { ...baseRow, node_type: "scope", is_root: true, parent_id: null },
      {
        surface: "item_detail",
        actions: ["read", "write"],
        fields: {
          profile: ["read"],
          spec_definitions: ["read"],
        },
      },
      {
        ...related,
        spec_definitions: [
          {
            id: "def-1",
            display_name: "SLC protocol",
            value_type: "enum",
            unit_id: null,
            unit_symbol: null,
            decimal_places: null,
            sort_order: 1,
            options: [],
            in_use_part_count: 2,
          },
        ],
      },
    );

    const specDefs = dto.spec_definitions as Array<Record<string, unknown>>;
    expect(specDefs[0]).not.toHaveProperty("in_use_participation_count");
    expect(specDefs[0]?.in_use_part_count).toBe(2);
  });
});
