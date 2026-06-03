"use server";

import { LatchError } from "@latch/contracts";
import type { ProjectedJobDetail } from "@/lib/jobs/project";
import { revalidatePath } from "next/cache";

import { getJobsDal, resolveContext } from "@/lib/latch";

export type JobDetailActionResult =
  | { ok: true; job?: ProjectedJobDetail }
  | { ok: false; error: string };

const revalidateJobs = (jobId: string): void => {
  revalidatePath("/jobs", "page");
  revalidatePath(`/jobs?id=${jobId}`, "page");
};

export const saveJobDetail = async (
  jobId: string,
  body: unknown,
): Promise<JobDetailActionResult> => {
  try {
    const ctx = await resolveContext({ surfaceId: "job_detail", entityId: jobId });
    const job = await getJobsDal().patch(ctx, jobId, body);
    revalidateJobs(jobId);
    return { ok: true, job };
  } catch (error) {
    if (error instanceof LatchError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
};

export const deleteJob = async (
  jobId: string,
): Promise<JobDetailActionResult> => {
  try {
    const ctx = await resolveContext({ surfaceId: "job_detail", entityId: jobId });
    await getJobsDal().delete(ctx, jobId);
    revalidateJobs(jobId);
    revalidatePath("/jobs", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof LatchError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
};
