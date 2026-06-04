import { fieldAllows, type PermissionContext } from "@latch/contracts";
import type { PendingChange } from "@latch/approval";

import { getJobsDal, resolveContext } from "@/lib/latch";
import { listJobDetailPendingForEntity } from "@/lib/pending-api";

import {
  overlayJobDetailVerificationPending,
  type ProjectedJobDetail,
} from "./project.js";

/** Open `submitted` row the current principal may withdraw (field tech propose flow). */
export const submitterOpenPendingId = (
  ctx: PermissionContext,
  pending: PendingChange | undefined,
): string | undefined => {
  if (!pending || pending.status !== "submitted") {
    return undefined;
  }
  if (pending.submittedBy !== ctx.principal.id) {
    return undefined;
  }
  if (
    !fieldAllows(ctx.manifest, "financial_terms", "submit") ||
    fieldAllows(ctx.manifest, "financial_terms", "write")
  ) {
    return undefined;
  }
  return pending.id;
};

export const loadProjectedJobDetail = async (
  jobId: string,
): Promise<{
  ctx: PermissionContext;
  job: ProjectedJobDetail;
  submitterOpenPendingId?: string;
}> => {
  const ctx = await resolveContext({ surfaceId: "job_detail", entityId: jobId });
  const base = getJobsDal().get(ctx, jobId);
  const { items } = await listJobDetailPendingForEntity(jobId, "submitted");
  const openPending = items.at(-1);
  const job = overlayJobDetailVerificationPending(
    base,
    ctx.manifest,
    ctx.principal.id,
    openPending,
  );
  return {
    ctx,
    job,
    submitterOpenPendingId: submitterOpenPendingId(ctx, openPending),
  };
};
