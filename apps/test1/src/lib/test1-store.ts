/** Scaffold (task 05) — global memory store; remove with `memory-store.ts` when Postgres-only. */
import { MemoryUserStore } from "../../db/memory-store.js";
import { seedTest1Users } from "../../db/seed.js";

type Test1Global = {
  store?: MemoryUserStore;
};

const test1Global = (): Test1Global => {
  const root = globalThis as typeof globalThis & {
    __latchTest1UserStore?: Test1Global;
  };
  if (!root.__latchTest1UserStore) {
    root.__latchTest1UserStore = {};
  }
  return root.__latchTest1UserStore;
};

/** Seeded in-memory store (mirrors `latch_user_roles` when DATABASE_URL is unset). */
export const getTest1Store = (): MemoryUserStore => {
  const g = test1Global();
  if (!g.store) {
    g.store = new MemoryUserStore();
    seedTest1Users(g.store);
  }
  return g.store;
};
