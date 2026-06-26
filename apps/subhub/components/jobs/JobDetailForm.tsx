"use client";

import { SaveOutlined, UndoOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  type Manifest,
} from "@latch/contracts";
import { App, Space, Tabs, Tag, Typography } from "antd";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { FormSection } from "@/components/form/FormSection";
import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import { SelectInput } from "@/components/form/SelectInput";
import { TextInput } from "@/components/form/TextInput";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useFieldMode } from "@/components/surface/useFieldMode";
import {
  JobStakeholderFields,
  validateJobStakeholderDuplicates,
  type JobStakeholderFormRow,
} from "@/components/jobs/JobStakeholderFields";
import { useJobSitePicker } from "@/lib/hooks/use-job-site-picker";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import {
  JobDetailCreateSchema,
  JobDetailPatchSchema,
} from "@/lib/jobs/descriptors/job-detail";
import { routes } from "@/lib/nav-routes";
import { SurfaceApiError } from "@/lib/surface-api";

const STATUS_COLORS: Record<string, string> = {
  planned: "default",
  active: "processing",
  cancelled: "error",
};

const JOB_KIND_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "service", label: "Service" },
  { value: "warranty", label: "Warranty" },
];

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
];

const statusLabel = (status: string): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

const jobKindLabel = (kind: string): string =>
  JOB_KIND_OPTIONS.find((option) => option.value === kind)?.label ??
  kind.charAt(0).toUpperCase() + kind.slice(1);

type JobDetailFormProps = {
  jobId: string;
  manifest: Manifest;
  canNavigateSite: boolean;
  canNavigateEstimate: boolean;
};

type JobDetailFormValues = {
  profile: {
    title: string;
    site_id: string;
    job_kind?: string;
    status?: string;
  };
  stakeholders: JobStakeholderFormRow[];
};

const mapStakeholders = (rows: unknown): JobStakeholderFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      party_id: typeof item.party_id === "string" ? item.party_id : "",
      relation_id: typeof item.relation_id === "string" ? item.relation_id : "",
      display_name: typeof item.display_name === "string" ? item.display_name : "",
      relation_label:
        typeof item.relation_label === "string" ? item.relation_label : "",
      kind: typeof item.kind === "string" ? item.kind : undefined,
      sort_order: typeof item.sort_order === "number" ? item.sort_order : index + 1,
    };
  });
};

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
  isCreate: boolean,
): JobDetailFormValues => {
  if (isCreate) {
    return {
      profile: {
        title: "",
        site_id: "",
      },
      stakeholders: [],
    };
  }

  const profile = data?.profile as
    | {
        title?: string | null;
        site_id?: string | null;
        job_kind?: string | null;
        status?: string | null;
      }
    | undefined;

  return {
    profile: {
      title: profile?.title ?? "",
      site_id: profile?.site_id ?? "",
      job_kind: profile?.job_kind ?? "project",
      status: profile?.status ?? "planned",
    },
    stakeholders: mapStakeholders(data?.stakeholders),
  };
};

const sitePickerOptions = (
  rows: Array<{ id: string; name: string }> | undefined,
): Array<{ value: string; label: string }> =>
  rows?.map((row) => ({
    value: row.id,
    label: row.name,
  })) ?? [];

const ProfileStatus = ({ status }: { status: string }) => {
  const mode = useFieldMode("profile");

  if (mode === "hidden") {
    return null;
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
        Status
      </Typography.Text>
      <Tag color={STATUS_COLORS[status] ?? "default"}>{statusLabel(status)}</Tag>
    </div>
  );
};

const ProfileJobKind = ({ jobKind }: { jobKind: string }) => {
  const mode = useFieldMode("profile");

  if (mode === "hidden") {
    return null;
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
        Job kind
      </Typography.Text>
      <Typography.Text>{jobKindLabel(jobKind)}</Typography.Text>
    </div>
  );
};

export const JobDetailForm = ({
  jobId,
  manifest,
  canNavigateSite,
  canNavigateEstimate,
}: JobDetailFormProps) => {
  const isCreate = jobId === "new";
  const router = useRouter();
  const { message } = App.useApp();
  const { data: detail, isLoading, isFetching, error } = useSurfaceDetail(
    "job_detail",
    isCreate ? undefined : jobId,
  );
  const { data: sitePicker, isLoading: sitePickerLoading } = useJobSitePicker();
  const patch = useSurfacePatch("job_detail", jobId);
  const create = useSurfaceListCreate("job_list", "job_detail");

  const activeManifest = detail?.manifest ?? manifest;
  const profile = detail?.data.profile as
    | {
        title?: string | null;
        site_id?: string | null;
        site_display_name?: string | null;
        job_kind?: string | null;
        status?: string | null;
        estimate_id?: string | null;
        estimate_display_title?: string | null;
      }
    | undefined;

  const defaultValues = useMemo(
    () =>
      isCreate
        ? buildDefaultValues(undefined, true)
        : buildDefaultValues(detail?.data, false),
    [detail?.data, isCreate],
  );

  const resolver = useMemo(() => {
    const baseSchema = (isCreate ? JobDetailCreateSchema : JobDetailPatchSchema) as z.ZodObject<
      z.ZodRawShape
    >;
    const narrowed = narrowPatchSchema(baseSchema, activeManifest) as z.ZodObject<z.ZodRawShape>;
    const loosened = narrowed.extend({
      stakeholders: z.array(z.object({}).passthrough()).optional(),
    });

    return zodResolver(loosened);
  }, [activeManifest, isCreate]);

  const form = useForm<JobDetailFormValues>({
    resolver: resolver as unknown as Resolver<JobDetailFormValues>,
    defaultValues,
  });

  const siteOptions = useMemo(() => {
    const options = sitePickerOptions(sitePicker?.data.rows);
    const currentId = profile?.site_id;
    const currentName = profile?.site_display_name;
    if (
      currentId &&
      currentName &&
      !options.some((option) => option.value === currentId)
    ) {
      return [...options, { value: currentId, label: currentName }];
    }
    return options;
  }, [profile?.site_display_name, profile?.site_id, sitePicker?.data.rows]);

  const {
    formState: { isDirty },
    watch,
  } = form;

  const canSave = patchableFieldIds(activeManifest).length > 0;
  const saving = patch.isPending || create.isPending;
  const siteId = watch("profile.site_id");
  const status = watch("profile.status") ?? profile?.status ?? "planned";
  const jobKind = watch("profile.job_kind") ?? profile?.job_kind ?? "project";
  const isCancelled = !isCreate && status === "cancelled";

  const onSave = form.handleSubmit(async (values) => {
    const stakeholders = values.stakeholders ?? [];

    if (
      fieldAllows(activeManifest, "stakeholders", "write") &&
      !validateJobStakeholderDuplicates(stakeholders, form.setError)
    ) {
      message.error("Fix duplicate stakeholders before saving");
      return;
    }

    const body: Record<string, unknown> = isCreate
      ? {
          profile: {
            title: values.profile.title,
            site_id: values.profile.site_id,
          },
        }
      : {
          profile: values.profile,
        };

    if (fieldAllows(activeManifest, "stakeholders", "write")) {
      body.stakeholders = stakeholders.map((row) => ({
        party_id: row.party_id,
        relation_id: row.relation_id,
      }));
    }

    try {
      if (isCreate) {
        const result = await create.mutateAsync(body);
        const newId = String(result.data.id);
        message.success("Job created");
        router.replace(routes.jobs.detail(newId));
        router.refresh();
        return;
      }

      await patch.mutateAsync(body);
      message.success("Job saved");
    } catch (saveError) {
      if (saveError instanceof SurfaceApiError) {
        if (saveError.status === 409) {
          message.error("Cannot modify a cancelled job");
          return;
        }

        const details = saveError.details as
          | { field?: string; code?: string; party_id?: string; relation_id?: string }
          | undefined;

        if (details?.field === "stakeholders" && details.code === "duplicate") {
          stakeholders.forEach((row, index) => {
            if (
              row.party_id === details.party_id &&
              row.relation_id === details.relation_id
            ) {
              form.setError(`stakeholders.${index}.relation_id`, {
                message: "This party already has this relation on the job",
              });
            }
          });
          message.error("Fix duplicate stakeholders before saving");
          return;
        }
      }

      message.error(isCreate ? "Unable to create job" : "Unable to save job");
    }
  });

  const onRevert = () => {
    form.reset(defaultValues);
    message.info("Reverted to last loaded values");
  };

  const toolbarActions = useMemo(
    () => [
      {
        key: "save",
        label: "Save",
        icon: <SaveOutlined />,
        priority: "primary" as const,
        surfaceAction: "write" as const,
        disabled: !canSave || isCancelled || (!isCreate && !isDirty),
        loading: saving,
        onClick: onSave,
      },
      ...(isCreate
        ? []
        : [
            {
              key: "revert",
              label: "Revert",
              icon: <UndoOutlined />,
              priority: "secondary" as const,
              surfaceAction: "write" as const,
              disabled: isCancelled || !isDirty || saving,
              onClick: onRevert,
            },
          ]),
    ],
    [canSave, isCancelled, isCreate, isDirty, onRevert, onSave, saving],
  );

  useRegisterSurfaceActions(activeManifest, toolbarActions);

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);
  const siteDisplayName =
    profile?.site_display_name ??
    siteOptions.find((option) => option.value === siteId)?.label;

  const overviewTab = (
    <>
      {fieldAllows(activeManifest, "profile", "read") ? (
        <FormSection title="Profile">
          <TextInput<JobDetailFormValues>
            field="profile"
            name="profile.title"
            label="Title"
          />
          <SelectInput<JobDetailFormValues>
            field="profile"
            name="profile.site_id"
            label="Site"
            options={siteOptions}
            loading={sitePickerLoading}
            selectProps={{
              showSearch: true,
              optionFilterProp: "label",
            }}
          />
          {siteId ? (
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Typography.Text type="secondary">Open:</Typography.Text>
                {canNavigateSite ? (
                  <Link href={routes.sites.detail(siteId)}>
                    {siteDisplayName ?? siteId}
                  </Link>
                ) : (
                  <Typography.Text type="secondary">
                    {siteDisplayName ?? siteId}
                  </Typography.Text>
                )}
              </Space>
            </div>
          ) : null}
          {!isCreate && isCancelled ? (
            <ProfileJobKind jobKind={jobKind} />
          ) : !isCreate ? (
            <SelectInput<JobDetailFormValues>
              field="profile"
              name="profile.job_kind"
              label="Job kind"
              options={JOB_KIND_OPTIONS}
            />
          ) : null}
          {!isCreate && isCancelled ? (
            <ProfileStatus status={status} />
          ) : !isCreate ? (
            <SelectInput<JobDetailFormValues>
              field="profile"
              name="profile.status"
              label="Status"
              options={STATUS_OPTIONS}
            />
          ) : null}
          {!isCreate && profile?.estimate_id ? (
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Typography.Text type="secondary">Source estimate:</Typography.Text>
                {canNavigateEstimate ? (
                  <Link href={routes.estimates.detail(profile.estimate_id)}>
                    {profile.estimate_display_title ?? profile.estimate_id}
                  </Link>
                ) : (
                  <Typography.Text type="secondary">
                    {profile.estimate_display_title ?? profile.estimate_id}
                  </Typography.Text>
                )}
              </Space>
            </div>
          ) : null}
        </FormSection>
      ) : null}
      {fieldAllows(activeManifest, "stakeholders", "read") ? (
        <JobStakeholderFields manifest={activeManifest} />
      ) : null}
    </>
  );

  const scopeTab = (
    <Typography.Paragraph type="secondary">
      Scope line items ship after the catalog and shared line editor (wave 4d′).
      {!isCreate && profile?.estimate_id ? (
        <>
          {" "}
          {canNavigateEstimate ? (
            <Link href={routes.estimates.detail(profile.estimate_id)}>
              View source estimate
            </Link>
          ) : (
            <Typography.Text type="secondary">
              Source estimate: {profile.estimate_display_title ?? profile.estimate_id}
            </Typography.Text>
          )}
        </>
      ) : null}
    </Typography.Paragraph>
  );

  const fieldTab = (
    <Typography.Paragraph type="secondary">
      Field status ships in wave 5c.
    </Typography.Paragraph>
  );

  const billingTab = (
    <Typography.Paragraph type="secondary">Billing ships in wave 6b.</Typography.Paragraph>
  );

  return (
    <SurfaceFormRoot
      manifest={activeManifest}
      loading={initialLoading}
      blocking={blocking}
      disabled={saving || isCancelled}
      form={form}
      defaultValues={defaultValues}
      resetKey={isCreate ? "create" : `${jobId}:${detail?.data?.id ?? ""}`}
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout maxWidth={SURFACE_FORM_MAX_WIDTH}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {isCreate ? "New job" : (profile?.title ?? "Job")}
          </Typography.Title>

          <Tabs
            items={[
              { key: "overview", label: "Overview", children: overviewTab },
              { key: "scope", label: "Scope", children: scopeTab },
              { key: "field", label: "Field", children: fieldTab },
              { key: "billing", label: "Billing", children: billingTab },
            ]}
          />
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
