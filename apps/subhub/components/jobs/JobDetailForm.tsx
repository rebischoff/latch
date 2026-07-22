"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  type Manifest,
} from "@latch/contracts";
import { App, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { notFound, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { FormFieldItem } from "@/components/form/FormFieldItem";
import { FormSection } from "@/components/form/FormSection";
import {
  LinkedSelectControl,
  LinkedSelectInput,
} from "@/components/form/LinkedSelectInput";
import { SelectInput } from "@/components/form/SelectInput";
import { TextInput } from "@/components/form/TextInput";
import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { DetailHeader } from "@/components/surface/DetailHeader";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { JobCostSummaryPanel } from "@/components/jobs/JobCostSummaryPanel";
import { JobFieldProgressPanels } from "@/components/jobs/JobFieldExplorePanels";
import { JobLineItemsPanels } from "@/components/jobs/JobLineItemsPanels";
import {
  jobConditionToPatch,
  jobLineToPatch,
  mapJobConditions,
  mapJobLineItems,
  type JobConditionFormRow,
  type JobLineFormRow,
} from "@/components/jobs/job-scope-tree";
import {
  JobStakeholderFields,
  validateJobStakeholderDuplicates,
  type JobStakeholderFormRow,
} from "@/components/jobs/JobStakeholderFields";
import { useApplyPickerReturn } from "@/lib/hooks/use-apply-picker-return";
import { useJobSitePicker } from "@/lib/hooks/use-job-site-picker";
import { useDetailTab } from "@/lib/hooks/use-detail-tab";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import { jobSitePickerKey } from "@/lib/hooks/surface-query-keys";
import {
  JobDetailCreateSchema,
  JobDetailPatchSchema,
} from "@/lib/jobs/descriptors/job-detail";
import type { JobCostSummary } from "@/lib/jobs/repository/job-cost-summary";
import type {
  JobFieldLifecycle,
  JobFieldProgressCell,
  JobFieldProgressDto,
} from "@/lib/jobs/repository/job-field-progress";
import type { JobFieldOrderCellPatch } from "@/lib/jobs/repository/job-field-order";
import type {
  JobFieldIssuePatch,
} from "@/lib/jobs/repository/job-issue";
import { routes } from "@/lib/nav-routes";
import { buildPickerCreateUrl, parseReturnContext } from "@/lib/picker-return-context";
import { navigateOnCancel } from "@/lib/surface-navigation";
import { SurfaceApiError } from "@/lib/surface-api";
import type { ToolbarAction } from "@/components/shell/SurfaceToolbar";

const JOB_TAB_KEYS = ["overview", "scope", "field", "billing"] as const;

const STATUS_COLORS: Record<string, string> = {
  planned: "default",
  active: "processing",
  cancelled: "error",
};

const LIFECYCLE_LABELS: Record<JobFieldLifecycle, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const LIFECYCLE_COLORS: Record<JobFieldLifecycle, string> = {
  not_started: "default",
  in_progress: "processing",
  completed: "success",
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
  canCreateSite: boolean;
};

type JobDetailFormValues = {
  profile: {
    title: string;
    site_id: string;
    job_kind?: string;
    status?: string;
  };
  stakeholders: JobStakeholderFormRow[];
  conditions: JobConditionFormRow[];
  line_items: JobLineFormRow[];
  field_progress: JobFieldProgressCell[];
  field_zone_orders: JobFieldOrderCellPatch[];
  field_issues: JobFieldIssuePatch[];
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
      conditions: [],
      line_items: [],
      field_progress: [],
      field_zone_orders: [],
      field_issues: [],
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
    conditions: mapJobConditions(data?.conditions),
    line_items: mapJobLineItems(data?.line_items),
    field_progress:
      (data?.field_progress as JobFieldProgressDto | undefined)?.cells ?? [],
    field_zone_orders: (
      (data?.field_progress as JobFieldProgressDto | undefined)?.order_cells ?? []
    ).map((row) => ({
      scope_phase_id: row.scope_phase_id,
      site_zone_id: row.site_zone_id,
      requested: row.requested,
    })),
    field_issues: [],
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
  canCreateSite,
}: JobDetailFormProps) => {
  const isCreate = jobId === "new";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pickerReturn = parseReturnContext(searchParams);
  const persistedPickerSelectedIdRef = useRef<string | null>(null);
  if (pickerReturn.selectedId) {
    persistedPickerSelectedIdRef.current = pickerReturn.selectedId;
  }
  const { message, modal } = App.useApp();
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
        catalog_scope_item_id?: string | null;
        catalog_scope_display_name?: string | null;
      }
    | undefined;

  const defaultValues = useMemo(() => {
    const base = isCreate
      ? buildDefaultValues(undefined, true)
      : buildDefaultValues(detail?.data, false);
    const pickedId = persistedPickerSelectedIdRef.current;
    if (pickedId) {
      return {
        ...base,
        profile: {
          ...base.profile,
          site_id: pickedId,
        },
      };
    }
    return base;
  }, [detail?.data, isCreate, pickerReturn.selectedId]);

  const resolver = useMemo(() => {
    const baseSchema = (isCreate ? JobDetailCreateSchema : JobDetailPatchSchema) as z.ZodObject<
      z.ZodRawShape
    >;
    const narrowed = narrowPatchSchema(baseSchema, activeManifest) as z.ZodObject<z.ZodRawShape>;
    const loosened = narrowed.extend({
      stakeholders: z.array(z.object({}).passthrough()).optional(),
      conditions: z.array(z.object({}).passthrough()).optional(),
      line_items: z.array(z.object({}).passthrough()).optional(),
      field_progress: z.array(z.object({}).passthrough()).optional(),
      field_zone_orders: z.array(z.object({}).passthrough()).optional(),
      field_issues: z.array(z.object({}).passthrough()).optional(),
    });

    return zodResolver(loosened);
  }, [activeManifest, isCreate]);

  const form = useForm<JobDetailFormValues>({
    resolver: resolver as unknown as Resolver<JobDetailFormValues>,
    defaultValues,
  });

  const { setValue, watch } = form;

  useApplyPickerReturn({
    setValue,
    returnField: "profile.site_id",
    pickerQueryKey: jobSitePickerKey,
  });

  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const siteCreateUrl = useMemo(
    () =>
      buildPickerCreateUrl({
        target: "site",
        returnTo,
        returnField: "profile.site_id",
      }),
    [returnTo],
  );

  const prevSiteIdRef = useRef<string | undefined>(undefined);
  const siteChangeConfirmOpenRef = useRef(false);

  const siteId = watch("profile.site_id");
  const status = watch("profile.status") ?? profile?.status ?? "planned";
  const jobKind = watch("profile.job_kind") ?? profile?.job_kind ?? "project";
  const isCancelled = !isCreate && status === "cancelled";
  const siteFrozen =
    !isCreate && (isCancelled || Boolean(profile?.estimate_id));
  const siteWritable =
    fieldAllows(activeManifest, "profile", "write") && !siteFrozen;
  const showAddSite =
    canCreateSite && fieldAllows(activeManifest, "profile", "write") && !siteFrozen;

  const fieldBoard = detail?.data.field_progress as
    | JobFieldProgressDto
    | undefined;
  const progressPct = fieldBoard?.progress_pct ?? 0;
  const fieldLifecycle = fieldBoard?.lifecycle;
  const fieldStale = fieldBoard?.stale ?? false;

  const statusOptions = useMemo(() => {
    if (isCancelled || progressPct <= 0) {
      return STATUS_OPTIONS;
    }
    return STATUS_OPTIONS.filter((option) => option.value !== "cancelled");
  }, [isCancelled, progressPct]);

  const siteOptions = useMemo(() => {
    const options = sitePickerOptions(sitePicker?.data.rows);
    const currentId = siteId || profile?.site_id;
    const currentName =
      profile?.site_display_name ??
      options.find((option) => option.value === currentId)?.label;
    if (
      currentId &&
      currentName &&
      !options.some((option) => option.value === currentId)
    ) {
      return [...options, { value: currentId, label: currentName }];
    }
    return options;
  }, [profile?.site_display_name, profile?.site_id, siteId, sitePicker?.data.rows]);

  const {
    formState: { isDirty },
  } = form;

  useEffect(() => {
    if (siteChangeConfirmOpenRef.current || siteFrozen) {
      return;
    }

    const prev = prevSiteIdRef.current;
    if (prev === undefined) {
      prevSiteIdRef.current = siteId;
      return;
    }

    if (prev === siteId) {
      return;
    }

    if (prev === "") {
      prevSiteIdRef.current = siteId;
      return;
    }

    const lineItems = form.getValues("line_items") ?? [];
    const conditions = form.getValues("conditions") ?? [];
    const hasStructure = conditions.length > 0 || lineItems.length > 0;
    if (!hasStructure) {
      prevSiteIdRef.current = siteId;
      return;
    }

    siteChangeConfirmOpenRef.current = true;
    modal.confirm({
      title: "Change site?",
      content: "Changing site clears conditions and line items. Save to persist.",
      okText: "Change site",
      onOk: () => {
        setValue("conditions", [], { shouldDirty: true });
        setValue("line_items", [], { shouldDirty: true });
        prevSiteIdRef.current = siteId;
        siteChangeConfirmOpenRef.current = false;
      },
      onCancel: () => {
        setValue("profile.site_id", prev, { shouldDirty: true });
        prevSiteIdRef.current = prev;
        siteChangeConfirmOpenRef.current = false;
      },
    });
  }, [form, modal, setValue, siteFrozen, siteId]);

  const canSave = patchableFieldIds(activeManifest).length > 0 && !isCancelled;
  const saving = patch.isPending || create.isPending;

  const persistJob = useCallback(
    async (values: JobDetailFormValues, afterCreate: "detail" | "reset") => {
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

      // Conditions + line items on create and edit (Scope-U1 engineer knobs);
      // sold_* / sold_quantity are server-owned (Scope-F1 / 47 JLI).
      if (fieldAllows(activeManifest, "conditions", "write")) {
        body.conditions = jobConditionToPatch(values.conditions ?? []);
      }

      if (fieldAllows(activeManifest, "line_items", "write")) {
        body.line_items = (values.line_items ?? []).map(jobLineToPatch);
      }

      if (
        !isCreate &&
        (fieldAllows(activeManifest, "field_progress", "write") ||
          fieldAllows(activeManifest, "field_zone_orders", "write") ||
          fieldAllows(activeManifest, "field_issues", "write"))
      ) {
        if (fieldAllows(activeManifest, "field_progress", "write")) {
          body.field_progress = values.field_progress ?? [];
        }
        if (
          fieldAllows(activeManifest, "field_zone_orders", "write") ||
          fieldAllows(activeManifest, "field_progress", "write")
        ) {
          body.field_zone_orders = values.field_zone_orders ?? [];
        }
        if (
          fieldAllows(activeManifest, "field_issues", "write") ||
          fieldAllows(activeManifest, "field_progress", "write")
        ) {
          body.field_issues = (values.field_issues ?? []).filter((patch) => {
            if (patch.op !== "create") {
              return true;
            }
            return typeof patch.description === "string" && patch.description.trim().length > 0;
          });
        }
      }

      try {
        if (isCreate) {
          const result = await create.mutateAsync(body);
          const newId = String(result.data.id);
          message.success("Job created");

          if (afterCreate === "reset") {
            form.reset(buildDefaultValues(undefined, true));
            return;
          }

          router.replace(routes.jobs.detail(newId));
          router.refresh();
          return;
        }

        await patch.mutateAsync(body);
        message.success("Job saved");
      } catch (saveError) {
        if (saveError instanceof SurfaceApiError) {
          if (saveError.status === 409) {
            const details = saveError.details as
              | { code?: string; progress_pct?: number }
              | undefined;
            if (details?.code === "cancel_requires_zero_progress") {
              message.error(
                "Cannot cancel a job once field progress is greater than 0%",
              );
              return;
            }
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
    },
    [activeManifest, create, form, isCreate, message, patch, router],
  );

  const onSave = form.handleSubmit((values) => persistJob(values, "detail"));

  const onSaveAndNew = useMemo(
    () =>
      isCreate
        ? form.handleSubmit((values) => persistJob(values, "reset"))
        : undefined,
    [form, isCreate, persistJob],
  );

  const onCancel = useCallback(() => {
    const navigate = () => {
      navigateOnCancel(router, null, routes.jobs.list);
    };

    if (isDirty) {
      modal.confirm({
        title: "Leave without saving?",
        content: "Unsaved changes will be lost.",
        okText: "Leave",
        onOk: navigate,
      });
      return;
    }

    navigate();
  }, [isDirty, modal, router]);

  const onRevert = useCallback(() => {
    form.reset(defaultValues);
    message.info("Reverted to last loaded values");
  }, [defaultValues, form, message]);

  const onRequestParts = useCallback(() => {
    // Primary compose is Field ☐ Order (task 55); list /requisitions/new stays secondary.
    router.push(`${routes.jobs.detail(jobId)}?tab=field`);
  }, [jobId, router]);

  const extraActions = useMemo<ToolbarAction[]>(() => {
    if (isCreate) {
      return [];
    }

    return [
      {
        key: "request-parts",
        label: "Order materials",
        priority: "secondary",
        onClick: onRequestParts,
      },
    ];
  }, [isCreate, onRequestParts]);

  useSurfaceFormChrome({
    mode: isCreate ? "create" : "edit",
    manifest: activeManifest,
    canSave,
    saving,
    onSave,
    isDirty,
    canDelete: false,
    onRevert: isCreate || isCancelled ? undefined : onRevert,
    onCancel: isCreate ? onCancel : undefined,
    onSaveAndNew,
    extraActions,
  });

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);

  const overviewTab = (
    <>
      {isCreate ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Use New for service, warranty, or blank project shells. For a sold contract,
          rebuild the signed amount on an estimate, then Win — do not edit sold $ on the
          job.
        </Typography.Paragraph>
      ) : null}
      {fieldAllows(activeManifest, "profile", "read") ? (
        <FormSection title="Profile">
          <TextInput<JobDetailFormValues>
            field="profile"
            name="profile.title"
            label="Title"
          />
          {siteWritable ? (
            <LinkedSelectInput<JobDetailFormValues>
              field="profile"
              name="profile.site_id"
              label="Site"
              options={siteOptions}
              loading={sitePickerLoading}
              canLink={canNavigateSite}
              linkHref={routes.sites.detail}
              canAddNew={showAddSite}
              addNewHref={siteCreateUrl}
              addNewLabel="Add site"
              selectProps={{
                showSearch: true,
                optionFilterProp: "label",
              }}
            />
          ) : (
            <FormFieldItem label="Site">
              <LinkedSelectControl
                mode="read"
                value={siteId}
                options={siteOptions}
                loading={sitePickerLoading}
                canLink={canNavigateSite}
                linkHref={routes.sites.detail}
              />
            </FormFieldItem>
          )}
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
              options={statusOptions}
            />
          ) : null}
          {!isCreate &&
          fieldAllows(activeManifest, "field_progress", "read") &&
          fieldLifecycle ? (
            <div style={{ marginBottom: 16 }}>
              <Space wrap>
                <Typography.Text type="secondary">Field:</Typography.Text>
                <Tag color={LIFECYCLE_COLORS[fieldLifecycle]}>
                  {LIFECYCLE_LABELS[fieldLifecycle]}
                </Tag>
                {fieldStale ? <Tag color="warning">Stale</Tag> : null}
                <Typography.Text type="secondary">
                  {progressPct.toFixed(0)}%
                </Typography.Text>
              </Space>
              {progressPct > 0 ? (
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginTop: 4, marginBottom: 0, fontSize: 12 }}
                >
                  Cancel is unavailable once field progress is greater than 0%.
                </Typography.Paragraph>
              ) : null}
            </div>
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
          {!isCreate && profile?.catalog_scope_item_id ? (
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Typography.Text type="secondary">Catalog scope:</Typography.Text>
                <Typography.Text>
                  {profile.catalog_scope_display_name ?? profile.catalog_scope_item_id}
                </Typography.Text>
              </Space>
            </div>
          ) : null}
          {!isCreate ? (
            <div style={{ marginBottom: 16 }}>
              <Link href={`${routes.jobs.detail(jobId)}?tab=field`}>
                Order materials on Field
              </Link>
            </div>
          ) : null}
        </FormSection>
      ) : null}
      {!isCreate ? (
        <JobCostSummaryPanel
          summary={detail?.data.cost_summary as JobCostSummary | undefined}
        />
      ) : null}
      {fieldAllows(activeManifest, "stakeholders", "read") ? (
        <JobStakeholderFields manifest={activeManifest} />
      ) : null}
    </>
  );

  const scopeTab = !fieldAllows(activeManifest, "line_items", "read") ? (
    <Typography.Paragraph type="secondary">
      You do not have access to scope line items.
    </Typography.Paragraph>
  ) : !siteId ? (
    <Typography.Paragraph type="secondary">
      Select a site to add conditions and line items.
    </Typography.Paragraph>
  ) : (
    <JobLineItemsPanels manifest={activeManifest} siteId={siteId} />
  );

  const fieldTab = isCreate ? (
    <Typography.Paragraph type="secondary">
      Save the job first to track field progress.
    </Typography.Paragraph>
  ) : !fieldAllows(activeManifest, "field_progress", "read") ? (
    <Typography.Paragraph type="secondary">
      You do not have access to field progress.
    </Typography.Paragraph>
  ) : !fieldBoard ? (
    <Typography.Paragraph type="secondary">Loading…</Typography.Paragraph>
  ) : (
    <JobFieldProgressPanels board={fieldBoard} readOnly={isCancelled} />
  );

  const billingTab = (
    <Typography.Paragraph type="secondary">Billing ships in wave 6b.</Typography.Paragraph>
  );

  const { activeKey, setTab } = useDetailTab({
    availableKeys: JOB_TAB_KEYS,
    defaultKey: "overview",
  });

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
        <SurfaceFormLayout>
          <DetailHeader
            title={isCreate ? "New job" : (profile?.title ?? "Job")}
            activeKey={activeKey}
            onChange={setTab}
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
