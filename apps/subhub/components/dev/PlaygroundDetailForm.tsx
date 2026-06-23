"use client";

import { patchableFieldIds } from "@latch/contracts";
import { App, Checkbox, Input, Skeleton, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useFormContext, type FieldPath } from "react-hook-form";

import { AutoCompleteInput } from "@/components/form/AutoCompleteInput";
import { DatePickerInput } from "@/components/form/DatePickerInput";
import {
  FieldArrayTable,
  type FieldArrayTableColumn,
} from "@/components/form/FieldArrayTable";
import { FormSection } from "@/components/form/FormSection";
import { SURFACE_FORM_MAX_WIDTH } from "@/components/form/formLayout";
import { InputNumberInput } from "@/components/form/InputNumberInput";
import { MentionsInput } from "@/components/form/MentionsInput";
import { RadioInput } from "@/components/form/RadioInput";
import { SelectInput } from "@/components/form/SelectInput";
import { SliderInput } from "@/components/form/SliderInput";
import { SwitchInput } from "@/components/form/SwitchInput";
import { TextAreaInput } from "@/components/form/TextAreaInput";
import { TextInput } from "@/components/form/TextInput";
import { TimePickerInput } from "@/components/form/TimePickerInput";
import { TransferInput } from "@/components/form/TransferInput";
import { TreeSelectInput } from "@/components/form/TreeSelectInput";
import { UploadInput } from "@/components/form/UploadInput";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";

import { usePlayground } from "./PlaygroundProvider";
import {
  ADDRESS_SUGGESTIONS,
  ASSIGNEE_TRANSFER_DATA,
  buildDefaultValues,
  buildPatchBody,
  CATEGORY_TREE,
  KIND_ALT_OPTIONS,
  KIND_OPTIONS,
  PARTY_OPTIONS,
  PLAYGROUND_SAVE_MS,
  PLAYGROUND_SLOW_SAVE_MS,
  type PlaygroundFormValues,
} from "./playground-fixtures";

const MENTION_OPTIONS = [
  { value: "team", label: "team" },
  { value: "alice", label: "alice" },
  { value: "bob", label: "bob" },
];

const PHONE_COLUMNS: FieldArrayTableColumn<PlaygroundFormValues, "phones">[] = [
  {
    key: "label",
    title: "Label",
    width: "30%",
    render: ({ index, writable, loading, disabled }) => (
      <PhoneCellInput
        name={`phones.${index}.label` as FieldPath<PlaygroundFormValues>}
        writable={writable}
        loading={loading}
        disabled={disabled}
      />
    ),
  },
  {
    key: "number",
    title: "Number",
    render: ({ index, writable, loading, disabled }) => (
      <PhoneCellInput
        name={`phones.${index}.number` as FieldPath<PlaygroundFormValues>}
        writable={writable}
        loading={loading}
        disabled={disabled}
      />
    ),
  },
  {
    key: "is_primary",
    title: "Primary",
    width: 90,
    render: ({ index, writable, loading, disabled }) => (
      <PhoneCellCheckbox
        name={`phones.${index}.is_primary` as FieldPath<PlaygroundFormValues>}
        writable={writable}
        loading={loading}
        disabled={disabled}
      />
    ),
  },
];

type PhoneCellProps = {
  name: FieldPath<PlaygroundFormValues>;
  writable: boolean;
  loading: boolean;
  disabled: boolean;
};

const PhoneCellInput = ({ name, writable, loading, disabled }: PhoneCellProps) => {
  const { control } = useFormContext<PlaygroundFormValues>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        if (loading) {
          return <Skeleton.Input active size="small" block />;
        }

        if (!writable) {
          return <Typography.Text>{String(field.value ?? "—")}</Typography.Text>;
        }

        return (
          <Input
            {...field}
            value={typeof field.value === "string" ? field.value : ""}
            disabled={disabled}
            status={fieldState.error ? "error" : undefined}
          />
        );
      }}
    />
  );
};

const PhoneCellCheckbox = ({ name, writable, loading, disabled }: PhoneCellProps) => {
  const { control } = useFormContext<PlaygroundFormValues>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        if (loading) {
          return <Skeleton.Button active size="small" />;
        }

        if (!writable) {
          return <Typography.Text>{field.value ? "Yes" : "No"}</Typography.Text>;
        }

        return (
          <Checkbox
            checked={Boolean(field.value)}
            disabled={disabled}
            onChange={(event) => field.onChange(event.target.checked)}
          />
        );
      }}
    />
  );
};

const PlaygroundPhonesBlock = () => {
  const mode = useFieldMode("phones");

  if (mode === "hidden") {
    return null;
  }

  return (
    <FormSection title="Phones">
      <FieldArrayTable<PlaygroundFormValues, "phones">
        field="phones"
        name="phones"
        columns={PHONE_COLUMNS}
        createRow={() => ({ label: "", number: "", is_primary: false })}
        addLabel="Add phone"
      />
    </FormSection>
  );
};

export const PlaygroundDetailForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const {
    manifest,
    dto,
    recordId,
    recordParam,
    hasLoaded,
    transitioning,
    ui,
    setLastSubmit,
    setIsDirty,
  } = usePlayground();
  const [savePending, setSavePending] = useState(false);

  const form = useForm<PlaygroundFormValues>({
    defaultValues: buildDefaultValues(dto),
  });

  const {
    formState: { isDirty },
    reset,
  } = form;

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  const defaultValues = useMemo(() => buildDefaultValues(dto), [dto]);
  const saving = ui.saving || savePending;
  const initialLoading = ui.loading || !hasLoaded;
  const blocking = transitioning || savePending;

  const submit = form.handleSubmit(async (values) => {
    const body = buildPatchBody(values, manifest);
    setLastSubmit(body);
    setSavePending(true);

    const delayMs = ui.slowNetwork
      ? PLAYGROUND_SLOW_SAVE_MS
      : PLAYGROUND_SAVE_MS;

    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, delayMs);
      });
      reset(buildDefaultValues(values));
      message.success("Saved (mock)");
    } finally {
      setSavePending(false);
    }
  });

  const onRevert = () => {
    reset(defaultValues);
    message.info("Reverted to last loaded values");
  };

  const onCreate = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("record", "new");
    router.replace(`/dev/form-playground?${params.toString()}`);
    message.info("New record (mock)");
  };

  const toolbarActions = useMemo(
    () => [
      {
        key: "save",
        label: "Save",
        priority: "primary" as const,
        surfaceAction: "write" as const,
        disabled: patchableFieldIds(manifest).length === 0,
        loading: saving,
        onClick: submit,
      },
      {
        key: "revert",
        label: "Revert",
        priority: "secondary" as const,
        surfaceAction: "write" as const,
        disabled: !isDirty || saving,
        onClick: onRevert,
      },
      ...(ui.canCreate
        ? [
            {
              key: "create",
              label: "New",
              priority: "secondary" as const,
              onClick: onCreate,
            } as const,
          ]
        : []),
      {
        key: "delete",
        label: "Delete",
        priority: "secondary" as const,
        surfaceAction: "delete" as const,
        danger: true,
        onClick: () => message.info("Delete (mock)"),
      },
    ],
    [
      defaultValues,
      isDirty,
      manifest,
      message,
      reset,
      router,
      saving,
      searchParams,
      submit,
      ui.canCreate,
    ],
  );

  useRegisterSurfaceActions(manifest, toolbarActions);

  return (
    <SurfaceFormRoot
      manifest={manifest}
      loading={initialLoading}
      blocking={blocking}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
      resetKey={`${recordId}:${recordParam ?? ""}`}
    >
      <form onSubmit={submit}>
        <SurfaceFormLayout maxWidth={SURFACE_FORM_MAX_WIDTH}>
          <FormSection title="Profile">
            <TextInput<PlaygroundFormValues>
              field="display_name"
              name="display_name"
              label="Display name"
            />
            <SelectInput<PlaygroundFormValues>
              field="kind"
              name="kind"
              label="Kind"
              options={KIND_OPTIONS}
            />
            <RadioInput<PlaygroundFormValues>
              field="kind_alt"
              name="kind_alt"
              label="Kind (radio)"
              options={KIND_ALT_OPTIONS}
            />
          </FormSection>

          <FormSection title="Notes">
            <TextAreaInput<PlaygroundFormValues>
              field="notes"
              name="notes"
              label="Notes"
            />
          </FormSection>

          <FormSection title="Portfolio">
            <SelectInput<PlaygroundFormValues>
              field="customer_party"
              name="customer_party"
              label="Customer"
              options={PARTY_OPTIONS}
            />
            <SelectInput<PlaygroundFormValues>
              field="property_owner_party"
              name="property_owner_party"
              label="Property owner"
              options={PARTY_OPTIONS}
            />
          </FormSection>

          <FormSection title="Misc">
            <InputNumberInput<PlaygroundFormValues>
              field="sort_order"
              name="sort_order"
              label="Sort order"
            />
            <SwitchInput<PlaygroundFormValues>
              field="is_active"
              name="is_active"
              label="Active"
            />
            <DatePickerInput<PlaygroundFormValues>
              field="effective_date"
              name="effective_date"
              label="Effective date"
            />
            <TimePickerInput<PlaygroundFormValues>
              field="start_time"
              name="start_time"
              label="Start time"
            />
            <AutoCompleteInput<PlaygroundFormValues>
              field="address_line"
              name="address_line"
              label="Address"
              options={ADDRESS_SUGGESTIONS}
            />
            <TreeSelectInput<PlaygroundFormValues>
              field="category_id"
              name="category_id"
              label="Category"
              treeData={CATEGORY_TREE}
            />
            <SliderInput<PlaygroundFormValues>
              field="priority"
              name="priority"
              label="Priority"
            />
            <MentionsInput<PlaygroundFormValues>
              field="body"
              name="body"
              label="Body"
              options={MENTION_OPTIONS}
            />
            <TransferInput<PlaygroundFormValues>
              field="assignee_ids"
              name="assignee_ids"
              label="Assignees"
              dataSource={ASSIGNEE_TRANSFER_DATA}
            />
          </FormSection>

          <FormSection title="Files">
            <UploadInput<PlaygroundFormValues>
              field="attachment"
              name="attachment"
              label="Attachment"
            />
          </FormSection>

          <PlaygroundPhonesBlock />
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
