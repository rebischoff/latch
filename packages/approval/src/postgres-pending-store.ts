import { withPermissionDb } from "@latch/audit";
import { Pool, type PoolClient } from "pg";

import type {
  PendingChange,
  PendingChangeInput,
  PendingResolveInput,
  PendingStatus,
  PendingStore,
} from "./pending-store.js";

type PendingRow = {
  id: string;
  surface_id: string;
  entity_id: string;
  field_ids: string[];
  patch: Record<string, unknown>;
  status: PendingStatus;
  submitted_by: string;
  submitted_at: Date;
  decided_by: string | null;
  decided_at: Date | null;
  comment: string | null;
  batch_id: string | null;
};

const SELECT_COLUMNS = `
  id::text,
  surface_id,
  entity_id,
  field_ids,
  patch,
  status,
  submitted_by,
  submitted_at,
  decided_by,
  decided_at,
  comment,
  batch_id::text
`;

const rowToChange = (row: PendingRow): PendingChange => ({
  id: row.id,
  surfaceId: row.surface_id,
  entityId: row.entity_id,
  fieldIds: row.field_ids,
  patch: row.patch,
  status: row.status,
  submittedBy: row.submitted_by,
  submittedAt: row.submitted_at,
  ...(row.decided_by != null ? { decidedBy: row.decided_by } : {}),
  ...(row.decided_at != null ? { decidedAt: row.decided_at } : {}),
  ...(row.comment != null ? { comment: row.comment } : {}),
  ...(row.batch_id != null ? { batchId: row.batch_id } : {}),
});

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code: string }).code === "23505";

export class PostgresPendingStore implements PendingStore {
  constructor(private readonly pool: Pool) {}

  submit = async (input: PendingChangeInput): Promise<PendingChange> => {
    const id = crypto.randomUUID();
    const submittedAt = new Date();

    try {
      return await withPermissionDb(
        this.pool,
        input.submittedBy,
        async (client) => this.insertSubmitted(client, input, id, submittedAt),
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new Error(
          "An open pending change already exists for this entity",
        );
      }
      throw err;
    }
  };

  resolve = async (
    id: string,
    decision: PendingResolveInput,
  ): Promise<PendingChange> => {
    const decidedAt = new Date();
    return withPermissionDb(this.pool, decision.decidedBy, async (client) => {
      const result = await client.query<PendingRow>(
        `UPDATE latch_pending_changes
         SET status = $2,
             decided_by = $3,
             decided_at = $4,
             comment = COALESCE($5, comment)
         WHERE id = $1 AND status = 'submitted'
         RETURNING ${SELECT_COLUMNS}`,
        [id, decision.status, decision.decidedBy, decidedAt, decision.comment ?? null],
      );

      if (result.rowCount === 0) {
        const existing = await this.getById(id);
        if (!existing) {
          throw new Error(`Pending change not found: ${id}`);
        }
        throw new Error(`Pending change ${id} is not submitted`);
      }

      return rowToChange(result.rows[0]!);
    });
  };

  getById = async (id: string): Promise<PendingChange | undefined> => {
    const result = await this.pool.query<PendingRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM latch_pending_changes
       WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? rowToChange(row) : undefined;
  };

  getPendingForEntity = async (
    entityId: string,
    filter?: { surfaceId?: string; status?: PendingStatus },
  ): Promise<PendingChange[]> => {
    const result = await this.pool.query<PendingRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM latch_pending_changes
       WHERE entity_id = $1
         AND ($2::text IS NULL OR surface_id = $2)
         AND ($3::text IS NULL OR status = $3)
       ORDER BY submitted_at ASC`,
      [entityId, filter?.surfaceId ?? null, filter?.status ?? null],
    );
    return result.rows.map(rowToChange);
  };

  private insertSubmitted = async (
    client: PoolClient,
    input: PendingChangeInput,
    id: string,
    submittedAt: Date,
  ): Promise<PendingChange> => {
    const result = await client.query<PendingRow>(
      `INSERT INTO latch_pending_changes (
        id,
        surface_id,
        entity_id,
        field_ids,
        patch,
        status,
        submitted_by,
        submitted_at,
        batch_id
      ) VALUES ($1, $2, $3, $4, $5, 'submitted', $6, $7, $8)
      RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        input.surfaceId,
        input.entityId,
        input.fieldIds,
        input.patch,
        input.submittedBy,
        submittedAt,
        input.batchId ?? null,
      ],
    );
    return rowToChange(result.rows[0]!);
  };
}

export type PostgresPendingStoreHandle = {
  store: PendingStore;
  pool: Pool;
  close: () => Promise<void>;
};

/** Persist pending rows in `latch_pending_changes` (survives process restart). */
export const createPostgresPendingStore = (
  connectionString: string,
): PostgresPendingStoreHandle => {
  const pool = new Pool({ connectionString });
  const store = new PostgresPendingStore(pool);

  return {
    store,
    pool,
    close: async () => {
      await pool.end();
    },
  };
};
