"use client";

import { SaveOutlined } from "@ant-design/icons";
import type { Manifest } from "@latch/contracts";
import { fieldAllows, writableFieldIds } from "@latch/contracts";
import type { ProjectedCustomerDetail } from "@/lib/customers/project";
import { CapabilitiesProvider, FieldControl } from "@latch/react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Space,
  Table,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, type Control } from "react-hook-form";

import { saveCustomerDetail } from "@/app/actions/customer-detail";
import { FormField } from "@/components/form/FormField";

type CustomerDetailPaneProps = {
  customerId: string;
  customer: ProjectedCustomerDetail;
  manifest: Manifest;
};

type CustomerFormValues = {
  name: string;
  phone: string;
  billing_notes: string;
  site_labels: string;
};

const toFormValues = (customer: ProjectedCustomerDetail): CustomerFormValues => ({
  name: customer.profile?.name ?? "",
  phone: customer.profile?.phone ?? "",
  billing_notes: customer.billing?.billing_notes ?? "",
  site_labels: customer.sites?.map((s) => s.label).join("\n") ?? "",
});

const buildPatch = (manifest: Manifest, values: CustomerFormValues) => {
  const patch: Record<string, unknown> = {};

  if (fieldAllows(manifest, "profile", "write")) {
    patch.profile = {
      name: values.name,
      phone: values.phone.trim() === "" ? null : values.phone,
    };
  }

  if (fieldAllows(manifest, "billing", "write")) {
    patch.billing = {
      billing_notes:
        values.billing_notes.trim() === "" ? null : values.billing_notes,
    };
  }

  if (fieldAllows(manifest, "sites", "write")) {
    const labels = values.site_labels
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    patch.sites = labels.map((label) => ({ label }));
  }

  return patch;
};

type SectionProps = {
  customer: ProjectedCustomerDetail;
  manifest: Manifest;
  control: Control<CustomerFormValues>;
  editable: boolean;
};

const ProfileSection = ({
  customer,
  manifest,
  control,
  editable,
}: SectionProps) => (
  <FieldControl manifest={manifest} field="profile">
    <Card title="Profile" size="small" style={{ marginBottom: 16 }}>
      {editable ? (
        <>
          <FormField label="Name" required>
            <Controller
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  status={fieldState.error ? "error" : undefined}
                />
              )}
            />
          </FormField>
          <FormField label="Phone">
            <Controller
              name="phone"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </FormField>
        </>
      ) : (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Name">
            {customer.profile?.name}
          </Descriptions.Item>
          <Descriptions.Item label="Phone">
            {customer.profile?.phone ?? "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  </FieldControl>
);

const BillingSection = ({
  customer,
  manifest,
  control,
  editable,
}: SectionProps) => (
  <FieldControl manifest={manifest} field="billing">
    <Card title="Billing" size="small" style={{ marginBottom: 16 }}>
      {editable ? (
        <FormField label="Billing notes">
          <Controller
            name="billing_notes"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={3} />
            )}
          />
        </FormField>
      ) : (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Billing notes">
            {customer.billing?.billing_notes ?? "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  </FieldControl>
);

const SitesSection = ({
  customer,
  manifest,
  control,
  editable,
}: SectionProps) => (
  <FieldControl manifest={manifest} field="sites">
    <Card title="Sites" size="small" style={{ marginBottom: 16 }}>
      {editable ? (
        <FormField label="Site labels (one per line)">
          <Controller
            name="site_labels"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={3} />
            )}
          />
        </FormField>
      ) : (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Sites">
            {customer.sites?.length
              ? customer.sites.map((s) => s.label).join(", ")
              : "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  </FieldControl>
);

const JobHistorySection = ({
  customer,
  manifest,
}: Pick<SectionProps, "customer" | "manifest">) => (
  <FieldControl manifest={manifest} field="job_history">
    <Card title="Job history" size="small" style={{ marginBottom: 16 }}>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={customer.job_history ?? []}
        columns={[
          { title: "Title", dataIndex: "title", key: "title" },
          { title: "Status", dataIndex: "status", key: "status" },
          { title: "ID", dataIndex: "id", key: "id" },
        ]}
      />
    </Card>
  </FieldControl>
);

const CustomerDetailForm = ({
  customerId,
  customer,
  manifest,
}: CustomerDetailPaneProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | undefined>();
  const [displayCustomer, setDisplayCustomer] = useState(customer);
  const canWriteProfile = fieldAllows(manifest, "profile", "write");
  const canWriteBilling = fieldAllows(manifest, "billing", "write");
  const canWriteSites = fieldAllows(manifest, "sites", "write");
  const hasWritableFields = writableFieldIds(manifest).length > 0;

  const { control, handleSubmit, reset } = useForm<CustomerFormValues>({
    defaultValues: toFormValues(customer),
  });

  useEffect(() => {
    setDisplayCustomer(customer);
    reset(toFormValues(customer));
    setActionError(undefined);
  }, [customer, reset]);

  const onSave = handleSubmit((values) => {
    setActionError(undefined);
    startTransition(async () => {
      const result = await saveCustomerDetail(
        customerId,
        buildPatch(manifest, values),
      );
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (result.customer) {
        setDisplayCustomer(result.customer);
        reset(toFormValues(result.customer));
      }
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSave} noValidate>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {displayCustomer.profile?.name ?? displayCustomer.id}
      </Typography.Title>
      <Typography.Text
        type="secondary"
        style={{ display: "block", marginBottom: 16 }}
      >
        {customer.id}
      </Typography.Text>
      {actionError ? (
        <Alert
          type="error"
          message={actionError}
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <ProfileSection
        customer={displayCustomer}
        manifest={manifest}
        control={control}
        editable={canWriteProfile}
      />
      <BillingSection
        customer={displayCustomer}
        manifest={manifest}
        control={control}
        editable={canWriteBilling}
      />
      <SitesSection
        customer={displayCustomer}
        manifest={manifest}
        control={control}
        editable={canWriteSites}
      />
      <JobHistorySection customer={displayCustomer} manifest={manifest} />
      {hasWritableFields ? (
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={pending}
          >
            Save
          </Button>
        </Space>
      ) : null}
    </form>
  );
};

export const CustomerDetailPane = ({
  customerId,
  customer,
  manifest,
}: CustomerDetailPaneProps) => (
  <CapabilitiesProvider manifest={manifest}>
    <CustomerDetailForm
      customerId={customerId}
      customer={customer}
      manifest={manifest}
    />
  </CapabilitiesProvider>
);
