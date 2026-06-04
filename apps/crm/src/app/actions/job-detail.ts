"use server";

import { LatchError } from "@latch/contracts";
import type { ProjectedJobDetail } from "@/lib/jobs/project";
import { revalidatePath } from "next/cache";

import { loadProjectedJobDetail } from "@/lib/jobs/load-detail";
import { getJobsDal, resolveContextFresh } from "@/lib/latch";
import { resolveJobDetailPendingById } from "@/lib/pending-api";

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
    const ctx = await resolveContextFresh({ surfaceId: "job_detail", entityId: jobId });
    await getJobsDal().patch(ctx, jobId, body);
    revalidateJobs(jobId);
    const { job } = await loadProjectedJobDetail(jobId);
    return { ok: true, job };
  } catch (error) {
    if (error instanceof LatchError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
};

export const acceptJobDetailPending = async (
  pendingId: string,
): Promise<JobDetailActionResult> => {
  try {
    const { ctx, pending } = await resolveJobDetailPendingById(pendingId);
    await getJobsDal().acceptPending(ctx, pendingId);
    revalidateJobs(pending.entityId);
    const { job } = await loadProjectedJobDetail(pending.entityId);
    return { ok: true, job };
  } catch (error) {
    if (error instanceof LatchError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
};

export const rejectJobDetailPending = async (
  pendingId: string,
  comment?: string,
): Promise<JobDetailActionResult> => {
  try {
    const { ctx, pending } = await resolveJobDetailPendingById(pendingId);
    await getJobsDal().rejectPending(ctx, pendingId, { comment });
    revalidateJobs(pending.entityId);
    const { job } = await loadProjectedJobDetail(pending.entityId);
    return { ok: true, job };
  } catch (error) {
    if (error instanceof LatchError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
};

export const withdrawJobDetailPending = async (
  pendingId: string,
): Promise<JobDetailActionResult> => {
  try {
    const { ctx, pending } = await resolveJobDetailPendingById(pendingId);
    await getJobsDal().withdrawPending(ctx, pendingId);
    revalidateJobs(pending.entityId);
    const { job } = await loadProjectedJobDetail(pending.entityId);
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
    const ctx = await resolveContextFresh({ surfaceId: "job_detail", entityId: jobId });
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
