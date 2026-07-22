import { describe, expect, it, vi } from "vitest";

import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import { principalWithRoles, type Manifest, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type StoreAdapter } from "@latch/dal";

import {
  itemDetailDescriptor,
  type ItemDetailRow,
  type ItemDetailStoreRelated,
} from "./descriptors/item-detail";

const audit = createMemoryAuditWriter();
setAuditWriter(audit.writer);

const SYSTEM_DATA_ROLE = "00000000-0000-4000-8000-000000000001";

const manifest: Manifest = {
  surface: "item_detail",
  actions: ["read", "write", "delete"],
  fields: {
    profile: ["read", "write"],
    commercial: ["read", "write"],
    item_labor_phase: ["read", "write"],
  },
};

const ctx: PermissionContext = {
  surface: "item_detail",
  principal: principalWithRoles("actor-1", [SYSTEM_DATA_ROLE]),
  manifest,
};

const baseRow: ItemDetailRow = {
  id: "item-1",
  name: "Leaf item",
  parent_id: "cat-1",
  parent_name: "Category",
  node_type: "item",
  sort_order: 1,
  csi_code: null,
  fallback_unit_cost: 0,
  freight_rate_type_id: null,
  incidental_rate_type_id: null,
  markup_type_id: null,
  material_phase_id: null,
  is_root: false,
  root_item_id: "root-1",
  root_item_name: "Scope",
  has_children: false,
  in_use: false,
};

const emptyRelated: ItemDetailStoreRelated = {
  item_labor_phase: [],
  resolved_labor_phase: [],
  spec_definitions: [],
};

describe("item_detail patch — related collections", () => {
  it("routes item_labor_phase to replaceRelated", async () => {
    const replaceRelated = vi.fn(async () => undefined);
    const store: StoreAdapter<ItemDetailRow, ItemDetailStoreRelated> = {
      get: async () => baseRow,
      list: async () => ({ rows: [], total: 0 }),
      upsert: async () => undefined,
      delete: async () => undefined,
      getRelated: async () => emptyRelated,
      replaceRelated,
      isRowVisibleToPrincipal: async () => true,
    };

    const dal = createSurfaceDal(itemDetailDescriptor, store);
    const laborPatch = [
      {
        labor_phase_id: "phase-1",
        labor_rate_type_id: "rate-1",
        hours_per_unit: 2,
        sort_order: 1,
      },
    ];

    await dal.patch(ctx, "item-1", {
      item_labor_phase: laborPatch,
    });

    expect(replaceRelated).toHaveBeenCalledWith("item-1", {
      item_labor_phase: laborPatch,
    });
  });
});
