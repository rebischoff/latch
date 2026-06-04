"use client";

import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import type { Manifest } from "@latch/contracts";
import {
  fieldAllows,
  fieldVisibleForUi,
  patchableFieldIds,
  surfaceAllows,
} from "@latch/contracts";
import type { ProjectedJobDetail } from "@/lib/jobs/project";
import { CapabilitiesProvider, FieldControl } from "@latch/react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Space,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, type Control } from "react-hook-form";

import {
  acceptJobDetailPending,
  deleteJob,
  rejectJobDetailPending,
  saveJobDetail,
  withdrawJobDetailPending,
  type JobDetailActionResult,
} from "@/app/actions/job-detail";
import { FormField } from "@/components/form/FormField";
import { RhfTextArea, RhfTextInput } from "@/components/form/RhfTextInput";

type JobDetailPaneProps = {
  jobId: string;
  job: ProjectedJobDetail;
  manifest: Manifest;
  /** Resolved for cross-Surface link gate (`customer_detail` surface `read`). */
  customerDetailManifest?: Manifest;
  /** Open proposal this principal may withdraw (from server). */
  submitterOpenPendingId?: string;
};

type JobFormValues = {
  title: string;
  status: string;
  scheduled_at: string;
  description: string;
  contract_amount: string;
  assignment_user_ids: string;
};

const proposedContractAmount = (job: ProjectedJobDetail): string => {
  const live = job.financial_terms?.contract_amount;
  if (live != null && live !== "") {
    return live;
  }
  const proposed = job.verification_pending?.financial_terms.contract_amount;
  return proposed ?? "";
};

const toFormValues = (job: ProjectedJobDetail): JobFormValues => ({
  title: job.summary?.title ?? "",
  status: job.summary?.status ?? "",
  scheduled_at: job.summary?.scheduled_at ?? "",
  description: job.scope?.description ?? "",
  contract_amount: proposedContractAmount(job),
  assignment_user_ids:
    job.assignments?.map((a) => a.user_id).join("\n") ?? "",
});

const buildPatch = (manifest: Manifest, values: JobFormValues) => {
  const patch: Record<string, unknown> = {};

  if (fieldAllows(manifest, "summary", "write")) {
    patch.summary = {
      title: values.title,
      status: values.status,
      scheduled_at:
        values.scheduled_at.trim() === "" ? null : values.scheduled_at,
    };
  }

  if (fieldAllows(manifest, "scope", "write")) {
    patch.scope = {
      description:
        values.description.trim() === "" ? null : values.description,
    };
  }

  if (
    fieldAllows(manifest, "financial_terms", "write") ||
    fieldAllows(manifest, "financial_terms", "submit")
  ) {
    patch.financial_terms = {
      contract_amount:
        values.contract_amount.trim() === "" ? null : values.contract_amount,
    };
  }

  if (fieldAllows(manifest, "assignments", "write")) {
    const userIds = values.assignment_user_ids
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    patch.assignments = userIds.map((user_id) => ({ user_id }));
  }

  return patch;
};

type SectionProps = {
  job: ProjectedJobDetail;
  manifest: Manifest;
  control: Control<JobFormValues>;
  editable: boolean;
};

const SummarySection = ({ job, manifest, control, editable }: SectionProps) => (
  <FieldControl manifest={manifest} field="summary">
    <Card title="Summary" size="small" style={{ marginBottom: 16 }}>
      {editable ? (
        <>
          <FormField label="Title" required>
            <Controller
              name="title"
              control={control}
              rules={{ required: "Title is required" }}
              render={({ field, fieldState }) => (
                <RhfTextInput
                  field={field}
                  status={fieldState.error ? "error" : undefined}
                />
              )}
            />
          </FormField>
          <FormField label="Status" required>
            <Controller
              name="status"
              control={control}
              rules={{ required: "Status is required" }}
              render={({ field, fieldState }) => (
                <RhfTextInput
                  field={field}
                  status={fieldState.error ? "error" : undefined}
                />
              )}
            />
          </FormField>
          <FormField label="Scheduled at (ISO)">
            <Controller
              name="scheduled_at"
              control={control}
              render={({ field }) => <RhfTextInput field={field} />}
            />
          </FormField>
        </>
      ) : (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Title">
            {job.summary?.title}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {job.summary?.status}
          </Descriptions.Item>
          <Descriptions.Item label="Scheduled at">
            {job.summary?.scheduled_at ?? "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  </FieldControl>
);

const ScopeSection = ({ job, manifest, control, editable }: SectionProps) => (
  <FieldControl manifest={manifest} field="scope">
    <Card title="Scope" size="small" style={{ marginBottom: 16 }}>
      {editable ? (
        <FormField label="Description">
          <Controller
            name="description"
            control={control}
            render={({ field }) => <RhfTextArea field={field} />}
          />
        </FormField>
      ) : (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Description">
            {job.scope?.description ?? "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  </FieldControl>
);

type FinancialSectionProps = Omit<SectionProps, "editable"> & {
  /** Editable propose/live field (submit-only hides input while a proposal is open). */
  showProposeInput: boolean;
  proposedAmount: string;
  verificationPending?: ProjectedJobDetail["verification_pending"];
  canApprove: boolean;
  showSubmitterWithdraw: boolean;
  financialMode: "direct_write" | "propose" | "review_only" | "hidden";
  onAccept?: () => void;
  onReject?: () => void;
  onWithdraw?: () => void;
  actionsPending?: boolean;
};

const FinancialSection = ({
  job,
  manifest,
  control,
  showProposeInput,
  proposedAmount,
  verificationPending,
  canApprove,
  showSubmitterWithdraw,
  financialMode,
  onAccept,
  onReject,
  onWithdraw,
  actionsPending,
}: FinancialSectionProps) => {
  if (!fieldVisibleForUi(manifest, "financial_terms")) {
    return null;
  }

  return (
    <Card title="Financial terms" size="small" style={{ marginBottom: 16 }}>
      {financialMode === "direct_write" ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Direct write"
          description="Save updates the live contract amount immediately (office admin)."
        />
      ) : null}
      {financialMode === "propose" && !showSubmitterWithdraw ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Proposal mode"
          description="Enter a contract amount and Save to send it for office approval. Live amount stays unchanged until accepted."
        />
      ) : null}
      {financialMode === "review_only" ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Review only"
          description="You cannot propose or edit financial terms with this account."
        />
      ) : null}
      {verificationPending && canApprove ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Pending verification"
          description={
            <>
              Proposed contract amount:{" "}
              <strong>
                {verificationPending.financial_terms.contract_amount ?? "—"}
              </strong>
              {job.financial_terms ? (
                <>
                  {" "}
                  (live: {job.financial_terms.contract_amount ?? "—"})
                </>
              ) : null}
            </>
          }
          action={
            <Space>
              <Button
                type="primary"
                size="small"
                loading={actionsPending}
                onClick={onAccept}
              >
                Accept
              </Button>
              <Button size="small" loading={actionsPending} onClick={onReject}>
                Reject
              </Button>
            </Space>
          }
        />
      ) : null}
      {showSubmitterWithdraw ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Proposal pending"
          description={
            <>
              Proposed amount:{" "}
              <strong>{proposedAmount !== "" ? proposedAmount : "—"}</strong>.
              Withdraw to clear it and enter a new amount.
            </>
          }
        />
      ) : null}
      {showSubmitterWithdraw ? (
        <Button
          block
          style={{ marginBottom: 12 }}
          loading={actionsPending}
          onClick={onWithdraw}
        >
          Withdraw proposal
        </Button>
      ) : null}
      {showProposeInput ? (
        <FormField label="Contract amount">
          <Controller
            name="contract_amount"
            control={control}
            render={({ field }) => <RhfTextInput field={field} />}
          />
        </FormField>
      ) : (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Contract amount">
            {proposedAmount !== "" ? proposedAmount : "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
};

type CustomerRefSectionProps = {
  job: ProjectedJobDetail;
  manifest: Manifest;
  customerDetailManifest: Manifest;
};

const CustomerRefSection = ({
  job,
  manifest,
  customerDetailManifest,
}: CustomerRefSectionProps) => {
  const ref = job.customer_ref;
  if (!ref || !surfaceAllows(customerDetailManifest, "read")) {
    return null;
  }

  return (
    <FieldControl manifest={manifest} field="customer_ref">
      <Card title="Customer" size="small" style={{ marginBottom: 16 }}>
        <Link href={`/customers?id=${encodeURIComponent(ref.id)}`}>
          {ref.name}
        </Link>
      </Card>
    </FieldControl>
  );
};

const AssignmentsSection = ({
  job,
  manifest,
  control,
  editable,
}: SectionProps) => (
  <FieldControl manifest={manifest} field="assignments">
    <Card title="Assignments" size="small" style={{ marginBottom: 16 }}>
      {editable ? (
        <FormField label="User IDs (one per line)">
          <Controller
            name="assignment_user_ids"
            control={control}
            render={({ field }) => <RhfTextArea field={field} />}
          />
        </FormField>
      ) : (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Assigned users">
            {job.assignments?.length
              ? job.assignments.map((a) => a.user_id).join(", ")
              : "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  </FieldControl>
);

const JobDetailForm = ({
  jobId,
  job,
  manifest,
  customerDetailManifest,
  submitterOpenPendingId: submitterOpenPendingIdProp,
}: JobDetailPaneProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | undefined>();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [displayJob, setDisplayJob] = useState(job);
  const [submitterOpenPendingId, setSubmitterOpenPendingId] = useState(
    submitterOpenPendingIdProp,
  );
  const canWriteSummary = fieldAllows(manifest, "summary", "write");
  const canWriteScope = fieldAllows(manifest, "scope", "write");
  const canWriteFinancial = fieldAllows(manifest, "financial_terms", "write");
  const canSubmitFinancial = fieldAllows(manifest, "financial_terms", "submit");
  const canApproveFinancial = fieldAllows(
    manifest,
    "financial_terms",
    "approve",
  );
  const verificationPending = displayJob.verification_pending;
  const proposedAmount = proposedContractAmount(displayJob);
  const openProposalId =
    submitterOpenPendingId ??
    (canSubmitFinancial && !canWriteFinancial
      ? verificationPending?.id
      : undefined);
  const showSubmitterWithdraw = Boolean(
    openProposalId && canSubmitFinancial && !canWriteFinancial,
  );
  const financialMode = !fieldVisibleForUi(manifest, "financial_terms")
    ? "hidden"
    : canWriteFinancial
      ? "direct_write"
      : canSubmitFinancial
        ? "propose"
        : canApproveFinancial
          ? "review_only"
          : "review_only";
  /** Field tech: editable input only when no open proposal; admin keeps live edit. */
  const showProposeInput =
    canWriteFinancial || (canSubmitFinancial && !showSubmitterWithdraw);
  const canWriteAssignments = fieldAllows(manifest, "assignments", "write");
  const hasPatchableFields = patchableFieldIds(manifest).length > 0;
  const canDelete = surfaceAllows(manifest, "delete");

  /** Stable key — avoid resetting the form when parent passes a new `job` reference each render. */
  const serverJobSyncKey = [
    job.id,
    submitterOpenPendingIdProp ?? "",
    job.verification_pending?.id ?? "",
    proposedContractAmount(job),
  ].join("|");

  const formSyncKey = [
    displayJob.id,
    submitterOpenPendingId ?? "",
    displayJob.verification_pending?.id ?? "",
    proposedContractAmount(displayJob),
  ].join("|");

  const formValues = useMemo(
    () => toFormValues(displayJob),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by formSyncKey
    [formSyncKey],
  );

  const { control, handleSubmit } = useForm<JobFormValues>({
    values: formValues,
    defaultValues: formValues,
  });

  useEffect(() => {
    setDisplayJob(job);
    setSubmitterOpenPendingId(submitterOpenPendingIdProp);
    setActionError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `job` keyed via serverJobSyncKey only
  }, [serverJobSyncKey]);

  const onSave = handleSubmit((values) => {
    setActionError(undefined);
    startTransition(async () => {
      const result = await saveJobDetail(jobId, buildPatch(manifest, values));
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (result.job) {
        setDisplayJob(result.job);
        setSubmitterOpenPendingId(
          result.job.verification_pending?.id ?? undefined,
        );
      }
    });
  });

  const runPendingAction = (
    action: () => Promise<JobDetailActionResult>,
  ): void => {
    setActionError(undefined);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (result.job) {
        setDisplayJob(result.job);
        setSubmitterOpenPendingId(
          result.job.verification_pending?.id ?? undefined,
        );
      }
    });
  };

  const onAcceptPending = () => {
    if (!verificationPending) {
      return;
    }
    runPendingAction(() => acceptJobDetailPending(verificationPending.id));
  };

  const onRejectPending = () => {
    if (!verificationPending) {
      return;
    }
    setRejectComment("");
    setRejectModalOpen(true);
  };

  const confirmRejectPending = () => {
    if (!verificationPending) {
      return;
    }
    const comment = rejectComment.trim() || undefined;
    setRejectModalOpen(false);
    runPendingAction(() =>
      rejectJobDetailPending(verificationPending.id, comment),
    );
  };

  const onWithdrawPending = () => {
    if (!openProposalId) {
      return;
    }
    Modal.confirm({
      title: "Withdraw proposal?",
      content: "You can submit a new amount after withdrawing.",
      okText: "Withdraw",
      onOk: () =>
        runPendingAction(async () => {
          const result = await withdrawJobDetailPending(openProposalId);
          if (result.ok) {
            setSubmitterOpenPendingId(undefined);
          }
          return result;
        }),
    });
  };

  const onDelete = () => {
    Modal.confirm({
      title: "Delete this job?",
      content: "This permanently removes the job. Recovery is via audit only.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        const result = await deleteJob(jobId);
        if (!result.ok) {
          setActionError(result.error);
          throw new Error(result.error);
        }
        router.push("/jobs");
        router.refresh();
      },
    });
  };

  return (
    <form onSubmit={onSave} noValidate>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {displayJob.summary?.title ?? displayJob.id}
      </Typography.Title>
      <Typography.Text
        type="secondary"
        style={{ display: "block", marginBottom: 16 }}
      >
        {job.id}
      </Typography.Text>
      {actionError ? (
        <Alert
          type="error"
          message={actionError}
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <SummarySection
        job={displayJob}
        manifest={manifest}
        control={control}
        editable={canWriteSummary}
      />
      <ScopeSection
        job={displayJob}
        manifest={manifest}
        control={control}
        editable={canWriteScope}
      />
      <Modal
        title="Reject proposed change?"
        open={rejectModalOpen}
        okText="Reject"
        okType="danger"
        onOk={confirmRejectPending}
        onCancel={() => setRejectModalOpen(false)}
        confirmLoading={pending}
      >
        <Input.TextArea
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="Optional comment"
          rows={3}
        />
      </Modal>
      <FinancialSection
        job={displayJob}
        manifest={manifest}
        control={control}
        showProposeInput={showProposeInput}
        proposedAmount={proposedAmount}
        verificationPending={verificationPending}
        canApprove={canApproveFinancial}
        showSubmitterWithdraw={showSubmitterWithdraw}
        financialMode={financialMode}
        onAccept={onAcceptPending}
        onReject={onRejectPending}
        onWithdraw={onWithdrawPending}
        actionsPending={pending}
      />
      <AssignmentsSection
        job={displayJob}
        manifest={manifest}
        control={control}
        editable={canWriteAssignments}
      />
      {customerDetailManifest ? (
        <CustomerRefSection
          job={displayJob}
          manifest={manifest}
          customerDetailManifest={customerDetailManifest}
        />
      ) : null}
      <Space>
        {hasPatchableFields ? (
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={pending}
          >
            Save
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
            disabled={pending}
          >
            Delete
          </Button>
        ) : null}
      </Space>
    </form>
  );
};

export const JobDetailPane = ({
  jobId,
  job,
  manifest,
  customerDetailManifest,
  submitterOpenPendingId,
}: JobDetailPaneProps) => (
  <CapabilitiesProvider manifest={manifest}>
    <JobDetailForm
      jobId={jobId}
      job={job}
      manifest={manifest}
      customerDetailManifest={customerDetailManifest}
      submitterOpenPendingId={submitterOpenPendingId}
    />
  </CapabilitiesProvider>
);
