"use server";

import { LatchError } from "@latch/contracts";
import { revalidatePath } from "next/cache";

import { getJobsDal, resolveContext } from "@/lib/latch";

export type UpdateJobSummaryResult =
  | { ok: true }
  | { ok: false; error: string };

export const updateJobSummary = async (
  jobId: string,
  title: string,
): Promise<UpdateJobSummaryResult> => {
  try {
    const ctx = resolveContext({ surfaceId: "job_detail", entityId: jobId });
    await getJobsDal().patch(ctx, jobId, { summary: { title } });
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof LatchError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
};
