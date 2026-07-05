"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { App } from "antd";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { CategorySpecDefinitionsField } from "@/components/catalog/CategorySpecDefinitionsField";
import { FormSection } from "@/components/form/FormSection";
import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import { InputNumberInput } from "@/components/form/InputNumberInput";
import { TextInput } from "@/components/form/TextInput";
import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { useMasterDetailSelectionOptional } from "@/components/shell/MasterDetailSelectionContext";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import {
  CategoryDetailCreateSchema,
  CategoryDetailPatchSchema,
} from "@/lib/catalog/descriptors/category-detail";
import { routes } from "@/lib/nav-routes";
import {
  navigateAfterCreate,
  navigateOnCancel,
  sanitizeReturnTo,
} from "@/lib/surface-navigation";
import { SurfaceApiError } from "@/lib/surface-api";

type CategoryDetailFormProps = {
  categoryId: string;
  manifest: Manifest;
  parentId?: string | null;
  returnTo?: string | null;
};

export type CategoryDetailFormValues = {
  profile: {
    name: string;
    sort_order: number;
    csi_code?: string | null;
    default_phase_template_id?: string | null;
    parent_id?: string | null;
    parent_name?: string | null;
    root_category_id?: string | null;
    root_category_name?: string | null;
    is_root?: boolean;
  };
  spec_definitions: Array<{
    id?: string;
    code?: string | null;
    display_name: string;
    value_type: "boolean" | "enum" | "text";
    filter_mode?: "prefer" | "required";
    sort_order?: number;
    options: Array<{
      id?: string;
      code?: string | null;
      display_name: string;
      sort_order?: number;
    }>;
  }>;
  spec_participation: {
    participates: Array<{
      spec_def_id: string;
      display_name: string;
      value_type: "boolean" | "enum" | "text";
      active: boolean;
      assign_category_id: string | null;
      excluded_here: boolean;
      state: "assigned" | "inherited" | "excluded" | "inactive";
    }>;
  };
};

const emptySpecParticipation = (): CategoryDetailFormValues["spec_participation"] => ({
  participates: [],
});

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
  isCreate: boolean,
  parentId?: string | null,
): CategoryDetailFormValues => {
  if (isCreate) {
    return {
      profile: {
        name: "",
        sort_order: 0,
        csi_code: null,
        default_phase_template_id: null,
        ...(parentId ? { parent_id: parentId } : {}),
      },
      spec_definitions: [],
      spec_participation: emptySpecParticipation(),
    };
  }

  const profile = data?.profile as CategoryDetailFormValues["profile"] | undefined;
  const specParticipation = data?.spec_participation as
    | CategoryDetailFormValues["spec_participation"]
    | undefined;

  return {
    profile: {
      name: profile?.name ?? "",
      sort_order: profile?.sort_order ?? 0,
      csi_code: profile?.csi_code ?? null,
      default_phase_template_id: profile?.default_phase_template_id ?? null,
      parent_id: profile?.parent_id ?? null,
      parent_name: profile?.parent_name ?? null,
      root_category_id: profile?.root_category_id ?? null,
      root_category_name: profile?.root_category_name ?? null,
      is_root: profile?.is_root ?? false,
    },
    spec_definitions: Array.isArray(data?.spec_definitions)
      ? (data.spec_definitions as CategoryDetailFormValues["spec_definitions"])
      : [],
    spec_participation: specParticipation ?? emptySpecParticipation(),
  };
};

const specDefinitionOwnerId = (
  values: CategoryDetailFormValues,
  row: CategoryDetailFormValues["spec_definitions"][number],
): string | null | undefined => {
  if (!row.id) {
    return undefined;
  }
  return values.spec_participation.participates.find((participation) => participation.spec_def_id === row.id)
    ?.assign_category_id;
};

/** Only defs owned by this category (or new rows at root) belong in the patch body. */
const patchableSpecDefinitions = (
  values: CategoryDetailFormValues,
  categoryId: string,
  isRoot: boolean,
): CategoryDetailFormValues["spec_definitions"] =>
  values.spec_definitions.filter((row) => {
    if (!row.id) {
      return isRoot;
    }
    return specDefinitionOwnerId(values, row) === categoryId;
  });

const toPatchBody = (
  values: CategoryDetailFormValues,
  manifest: Manifest,
  isRoot: boolean,
  categoryId: string,
): Record<string, unknown> => {
  const patchable = patchableFieldIds(manifest);
  const body: Record<string, unknown> = {};

  if (patchable.includes("profile")) {
    body.profile = {
      name: values.profile.name,
      sort_order: values.profile.sort_order,
      csi_code: values.profile.csi_code ?? null,
      ...(isRoot
        ? { default_phase_template_id: values.profile.default_phase_template_id ?? null }
        : {}),
    };
  }

  if (patchable.includes("spec_definitions")) {
    const ownedRows = patchableSpecDefinitions(values, categoryId, isRoot);
    if (ownedRows.length > 0) {
      body.spec_definitions = ownedRows.map((row, index) => ({
        ...(row.id ? { id: row.id } : {}),
        code: row.code ?? null,
        display_name: row.display_name,
        value_type: row.value_type,
        filter_mode: row.filter_mode ?? "required",
        sort_order: row.sort_order ?? index + 1,
        options:
          row.value_type === "enum"
            ? row.options.map((option, optionIndex) => ({
                ...(option.id ? { id: option.id } : {}),
                code: option.code ?? null,
                display_name: option.display_name,
                sort_order: option.sort_order ?? optionIndex + 1,
              }))
            : [],
      }));
    }
  }

  if (patchable.includes("spec_participation")) {
    body.spec_participation = {
      participates: values.spec_participation.participates.map((row) => ({
        spec_def_id: row.spec_def_id,
        active: row.active,
      })),
    };
  }

  return body;
};

export const CategoryDetailForm = ({
  categoryId,
  manifest,
  parentId,
  returnTo = null,
}: CategoryDetailFormProps) => {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const isCreate = categoryId === "new";
  const detailQuery = useSurfaceDetail(
    "category_detail",
    isCreate ? undefined : categoryId,
  );
  const patchMutation = useSurfacePatch("category_detail", categoryId);
  const deleteMutation = useSurfaceDelete("category_detail", categoryId);
  const createMutation = useSurfaceListCreate("category_list", "category_detail");
  const initialValuesRef = useRef<CategoryDetailFormValues | null>(null);
  const selection = useMasterDetailSelectionOptional();

  const activeManifest = detailQuery.data?.manifest ?? manifest;

  const defaultValues = useMemo(
    () => buildDefaultValues(detailQuery.data?.data, isCreate, parentId),
    [detailQuery.data?.data, isCreate, parentId],
  );

  const resolver = useMemo(() => {
    const baseSchema = (
      isCreate ? CategoryDetailCreateSchema : CategoryDetailPatchSchema
    ) as z.ZodObject<z.ZodRawShape>;
    const narrowed = narrowPatchSchema(baseSchema, activeManifest) as z.ZodObject<z.ZodRawShape>;
    const loosened = narrowed.extend({
      // Server enforces strict profile schema; form carries read-only display keys.
      profile: z.object({}).passthrough().optional(),
      spec_definitions: z.array(z.object({}).passthrough()).optional(),
      spec_participation: z.object({}).passthrough().optional(),
    });

    return zodResolver(loosened);
  }, [activeManifest, isCreate]);

  const form = useForm<CategoryDetailFormValues>({
    resolver: resolver as unknown as Resolver<CategoryDetailFormValues>,
    defaultValues,
    values: isCreate ? undefined : defaultValues,
  });

  const {
    formState: { isDirty },
  } = form;

  const isRoot = form.watch("profile.is_root") ?? false;
  const canDelete = !isCreate && surfaceAllows(activeManifest, "delete");
  const canSave = patchableFieldIds(activeManifest).length > 0;
  const saving = patchMutation.isPending || createMutation.isPending;

  const buildCreateProfile = useCallback(
    (profile: CategoryDetailFormValues["profile"]) => {
      const resolvedParentId = parentId ?? profile.parent_id;
      return {
        name: profile.name,
        sort_order: profile.sort_order,
        csi_code: profile.csi_code ?? null,
        ...(resolvedParentId ? { parent_id: resolvedParentId } : {}),
      };
    },
    [parentId],
  );

  const persistCategory = useCallback(
    async (values: CategoryDetailFormValues, afterCreate: "detail" | "reset") => {
      try {
        if (isCreate) {
          const result = await createMutation.mutateAsync({
            profile: buildCreateProfile(values.profile),
          });
          const newId = String(result.data.id);
          message.success("Category created");

          if (afterCreate === "reset") {
            form.reset(buildDefaultValues(undefined, true, parentId));
            return;
          }

          selection?.setSelectedId(newId);

          if (returnTo) {
            navigateAfterCreate(router, {
              returnTo: sanitizeReturnTo(returnTo, routes.categories.list),
              newId,
              fallbackList: routes.categories.list,
              fallbackDetail: routes.categories.detail,
            });
            return;
          }

          router.replace(routes.categories.detail(newId));
          router.refresh();
          return;
        }

        const body = toPatchBody(values, activeManifest, isRoot, categoryId);
        await patchMutation.mutateAsync(body);
        message.success("Category saved");
        form.reset(values);
        initialValuesRef.current = values;
      } catch (error) {
        const text =
          error instanceof SurfaceApiError ? error.message : "Unable to save category";
        message.error(text);
      }
    },
    [
      activeManifest,
      buildCreateProfile,
      createMutation,
      form,
      isCreate,
      isRoot,
      message,
      parentId,
      patchMutation,
      returnTo,
      router,
      selection,
    ],
  );

  const onSave = form.handleSubmit((values) => persistCategory(values, "detail"));

  const onSaveAndNew = useMemo(
    () =>
      isCreate && !returnTo
        ? form.handleSubmit((values) => persistCategory(values, "reset"))
        : undefined,
    [form, isCreate, persistCategory, returnTo],
  );

  const onCancel = useCallback(() => {
    const navigate = () => {
      navigateOnCancel(router, returnTo, routes.categories.list);
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
  }, [isDirty, modal, returnTo, router]);

  const onRevert = useCallback(() => {
    form.reset(initialValuesRef.current ?? defaultValues);
    message.info("Reverted to last loaded values");
  }, [defaultValues, form, message]);

  const onDelete = useCallback(() => {
    modal.confirm({
      title: "Delete category?",
      content: "This permanently removes the category.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync();
          message.success("Category deleted");
          router.push(routes.categories.list);
        } catch (error) {
          const text =
            error instanceof SurfaceApiError ? error.message : "Unable to delete category";
          message.error(text);
        }
      },
    });
  }, [deleteMutation, message, modal, router]);

  useSurfaceFormChrome({
    mode: isCreate ? "create" : "edit",
    manifest: activeManifest,
    canSave,
    saving,
    onSave,
    isDirty,
    canDelete,
    onDelete: isCreate ? undefined : onDelete,
    onRevert: isCreate ? undefined : onRevert,
    onCancel: isCreate ? onCancel : undefined,
    onSaveAndNew,
  });

  if (!isCreate && detailQuery.error instanceof SurfaceApiError && detailQuery.error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && detailQuery.isLoading && !detailQuery.data;
  const blocking = !isCreate && detailQuery.isFetching && Boolean(detailQuery.data);

  return (
    <SurfaceFormRoot
      manifest={activeManifest}
      loading={initialLoading}
      blocking={blocking}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
      resetKey={isCreate ? "create" : `${categoryId}:${detailQuery.data?.data?.id ?? ""}`}
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout maxWidth={SURFACE_FORM_MAX_WIDTH}>
        <FormSection title="Profile">
          {fieldAllows(activeManifest, "profile", "read") ? (
            <>
              <TextInput<CategoryDetailFormValues>
                field="profile"
                name="profile.name"
                label="Name"
              />
              <InputNumberInput<CategoryDetailFormValues>
                field="profile"
                name="profile.sort_order"
                label="Sort order"
              />
              <TextInput<CategoryDetailFormValues>
                field="profile"
                name="profile.csi_code"
                label="CSI code"
              />
              {isRoot && fieldAllows(activeManifest, "profile", "write") ? (
                <TextInput<CategoryDetailFormValues>
                  field="profile"
                  name="profile.default_phase_template_id"
                  label="Default phase template id"
                />
              ) : null}
            </>
          ) : null}
        </FormSection>

        <CategorySpecDefinitionsField
          categoryId={categoryId}
          isCreate={isCreate}
          manifest={activeManifest}
        />
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
