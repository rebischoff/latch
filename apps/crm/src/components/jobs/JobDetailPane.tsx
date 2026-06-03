"use client";

import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import type { Manifest } from "@latch/contracts";
import { fieldAllows, surfaceAllows, writableFieldIds } from "@latch/contracts";
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
import { useEffect, useState, useTransition } from "react";
import {
  Controller,
  useForm,
  type Control,
} from "react-hook-form";

import { deleteJob, saveJobDetail } from "@/app/actions/job-detail";
import { FormField } from "@/components/form/FormField";

type JobDetailPaneProps = {
  jobId: string;
  job: ProjectedJobDetail;
  manifest: Manifest;
  /** Resolved for cross-Surface link gate (`customer_detail` surface `read`). */
  customerDetailManifest?: Manifest;
};

type JobFormValues = {
  title: string;
  status: string;
  scheduled_at: string;
  description: string;
  contract_amount: string;
  assignment_user_ids: string;
};

const toFormValues = (job: ProjectedJobDetail): JobFormValues => ({
  title: job.summary?.title ?? "",
  status: job.summary?.status ?? "",
  scheduled_at: job.summary?.scheduled_at ?? "",
  description: job.scope?.description ?? "",
  contract_amount: job.financial_terms?.contract_amount ?? "",
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

  if (fieldAllows(manifest, "financial_terms", "write")) {
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
                <Input
                  {...field}
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
                <Input
                  {...field}
                  status={fieldState.error ? "error" : undefined}
                />
              )}
            />
          </FormField>
          <FormField label="Scheduled at (ISO)">
            <Controller
              name="scheduled_at"
              control={control}
              render={({ field }) => <Input {...field} />}
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
            render={({ field }) => (
              <Input.TextArea {...field} rows={3} />
            )}
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

const FinancialSection = ({
  job,
  manifest,
  control,
  editable,
}: SectionProps) => (
  <FieldControl manifest={manifest} field="financial_terms">
    <Card title="Financial terms" size="small" style={{ marginBottom: 16 }}>
      {editable ? (
        <FormField label="Contract amount">
          <Controller
            name="contract_amount"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
        </FormField>
      ) : (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Contract amount">
            {job.financial_terms?.contract_amount ?? "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  </FieldControl>
);

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
            render={({ field }) => (
              <Input.TextArea {...field} rows={3} />
            )}
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
}: JobDetailPaneProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | undefined>();
  const [displayJob, setDisplayJob] = useState(job);
  const canWriteSummary = fieldAllows(manifest, "summary", "write");
  const canWriteScope = fieldAllows(manifest, "scope", "write");
  const canWriteFinancial = fieldAllows(manifest, "financial_terms", "write");
  const canWriteAssignments = fieldAllows(manifest, "assignments", "write");
  const hasWritableFields = writableFieldIds(manifest).length > 0;
  const canDelete = surfaceAllows(manifest, "delete");

  const { control, handleSubmit, reset } = useForm<JobFormValues>({
    defaultValues: toFormValues(job),
  });

  useEffect(() => {
    setDisplayJob(job);
    reset(toFormValues(job));
    setActionError(undefined);
  }, [job, reset]);

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
        reset(toFormValues(result.job));
      }
      router.refresh();
    });
  });

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
      <FinancialSection
        job={displayJob}
        manifest={manifest}
        control={control}
        editable={canWriteFinancial}
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
        {hasWritableFields ? (
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
}: JobDetailPaneProps) => (
  <CapabilitiesProvider manifest={manifest}>
    <JobDetailForm
      jobId={jobId}
      job={job}
      manifest={manifest}
      customerDetailManifest={customerDetailManifest}
    />
  </CapabilitiesProvider>
);
