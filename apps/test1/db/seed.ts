import type { MemoryUserStore } from "./memory-store.js";

/**
 * Platform seed (min boot) — users + role assignments only.
 * Business sample rows belong in a separate seed (task 10+), not here.
 * Postgres canonical copy: `migrations/001_init.sql` (consolidate to one path later).
 */

/** `admin@test1.local` — matches apps/test1/docs/AUTH.md */
export const SEED_ADMIN_ID = "seed-admin";
export const SEED_ADMIN_EMAIL = "admin@test1.local";

export const SEED_USER_ID = "seed-user";
export const SEED_USER_EMAIL = "user@test1.local";

export const SEED_READONLY_ID = "seed-readonly";
export const SEED_READONLY_EMAIL = "readonly@test1.local";

/** Populates in-memory latch users + role assignments (mirrors 001_init.sql seed). */
export const seedTest1Users = (store: MemoryUserStore): void => {
  store.clear();

  store.upsertUser({
    id: SEED_ADMIN_ID,
    displayName: "Admin (seed)",
    loginEmail: SEED_ADMIN_EMAIL,
  });
  store.upsertUser({
    id: SEED_USER_ID,
    displayName: "User (seed)",
    loginEmail: SEED_USER_EMAIL,
  });
  store.upsertUser({
    id: SEED_READONLY_ID,
    displayName: "Readonly (seed)",
    loginEmail: SEED_READONLY_EMAIL,
  });

  store.setUserRoles(SEED_ADMIN_ID, ["iam_master", "data_master"]);
};
