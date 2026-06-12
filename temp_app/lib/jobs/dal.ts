import { createSurfaceDal } from "@latch/dal";

import {
  createJobDetailDescriptor,
  createJobListDescriptor,
} from "./descriptors.js";
import { seedPilotJobs } from "./seed.js";
import { createJobStoreAdapter } from "./store-adapter.js";
import { MemoryJobStore } from "./store.js";

const store = new MemoryJobStore();
seedPilotJobs(store);

const adapter = createJobStoreAdapter(store);

const jobListDalInstance = createSurfaceDal(
  createJobListDescriptor(store),
  adapter,
);

if (!jobListDalInstance.list) {
  throw new Error("job_list DAL must expose list capability");
}

export const jobListDal = { list: jobListDalInstance.list };

export const jobDetailDal = createSurfaceDal(
  createJobDetailDescriptor(store),
  adapter,
);

export const getMemoryJobStore = (): MemoryJobStore => store;
