import { MemoryJobStore } from "../../db/memory-store.js";
import { seedPilotJobs } from "../../db/seed.js";

type PilotGlobal = {
  store?: MemoryJobStore;
};

const pilotGlobal = (): PilotGlobal => {
  const root = globalThis as typeof globalThis & {
    __latchCrmPilotStore?: PilotGlobal;
  };
  if (!root.__latchCrmPilotStore) {
    root.__latchCrmPilotStore = {};
  }
  return root.__latchCrmPilotStore;
};

/** Seeded in-memory store (mirrors `latch_user_roles` + pilot data). */
export const getPilotStore = (): MemoryJobStore => {
  const g = pilotGlobal();
  if (!g.store) {
    g.store = new MemoryJobStore();
    seedPilotJobs(g.store);
  }
  return g.store;
};
