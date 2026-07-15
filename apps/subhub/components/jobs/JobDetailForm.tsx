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
import { JobFieldExploreTable } from "@/components/jobs/JobFieldExploreTable";
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
import { routes } from "@/lib/nav-routes";
import { buildPickerCreateUrl, parseReturnContext } from "@/lib/picker-return-context";
import { navigateOnCancel } from "@/lib/surface-navigation";
import { SurfaceApiError } from "@/lib/surface-api";

const JOB_TAB_KEYS = ["overview", "scope", "field", "billing"] as const;

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
  /** Hidden — used for warn-and-clear when Scope editor is still stubbed. */
  line_items: unknown[];
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

const mapLineItems = (rows: unknown): unknown[] => (Array.isArray(rows) ? rows : []);

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
      line_items: [],
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
    line_items: mapLineItems(data?.line_items),
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
      line_items: z.array(z.object({}).passthrough()).optional(),
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
    if (lineItems.length === 0) {
      prevSiteIdRef.current = siteId;
      return;
    }

    siteChangeConfirmOpenRef.current = true;
    modal.confirm({
      title: "Change site?",
      content: "Changing site clears line items. Save to persist.",
      okText: "Change site",
      onOk: () => {
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
  });

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);

  const overviewTab = (
    <>
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

  const fieldTab = isCreate ? (
    <Typography.Paragraph type="secondary">
      Save the job first to explore field progress.
    </Typography.Paragraph>
  ) : (
    <JobFieldExploreTable />
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
