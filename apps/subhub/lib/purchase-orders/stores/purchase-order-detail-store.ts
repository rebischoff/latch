import { ConflictError } from "@latch/contracts";
import type { StoreAdapter } from "@latch/dal";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";

import type { PurchaseOrderDetailRow } from "../repository";
import { deletePurchaseOrder, loadPurchaseOrderDetail } from "../repository";

const notImplemented = (surface: string, operation: string): never => {
  throw new Error(`${surface} ${operation} is not implemented yet`);
};

export const createPurchaseOrderDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<PurchaseOrderDetailRow> => ({
  get: async (id) => loadPurchaseOrderDetail(pool, id),

  list: async () => notImplemented("purchase_order_detail", "list"),

  upsert: async (row) => {
    const actorId = await getActorId();
    await withPermissionDb(pool, actorId, async (client) => {
      const existing = await client.query<{ status: string }>(
        `SELECT status FROM purchase_order WHERE id = $1`,
        [row.id],
      );
      const status = existing.rows[0]?.status;
      if (!status) {
        throw new ConflictError("Purchase order not found");
      }
      // PO6: edit in place only while draft.
      if (status !== "draft") {
        throw new ConflictError(
          "Purchase order can only be edited while draft",
          { field: "status", code: "po_not_draft", status },
        );
      }
      await client.query(
        `UPDATE purchase_order
         SET delivery_method = $2,
             ship_to_note = $3,
             updated_at = now()
         WHERE id = $1`,
        [row.id, row.delivery_method, row.ship_to_note],
      );
    });
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deletePurchaseOrder(pool, actorId, id);
  },

  getRelated: async (id) => {
    const detail = await loadPurchaseOrderDetail(pool, id);
    if (!detail) {
      return undefined;
    }
    return { line_items: detail.line_items };
  },

  replaceRelated: async () =>
    notImplemented("purchase_order_detail", "related write"),

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadPurchaseOrderDetail(pool, entityId)) !== undefined;
  },
});
