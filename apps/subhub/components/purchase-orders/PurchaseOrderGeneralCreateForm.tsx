"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Select, Space, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { routes } from "@/lib/nav-routes";
import {
  fetchRequisitionPool,
  postGeneralBucketPurchaseOrder,
} from "@/lib/surface-api";

/**
 * RP9: create a job-less general-bucket PO (vendor only). Lines added freeform
 * on the detail screen (RP10). Job-assigned POs are created from /requisitions.
 */
export const PurchaseOrderGeneralCreateForm = () => {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ vendor_party_id: string }>();

  const vendorsQuery = useQuery({
    queryKey: ["requisition-pool-vendors"],
    queryFn: () => fetchRequisitionPool({}),
  });

  const vendors = vendorsQuery.data?.data.vendors ?? [];

  const createMutation = useMutation({
    mutationFn: (values: { vendor_party_id: string }) =>
      postGeneralBucketPurchaseOrder(values),
    onSuccess: async (result) => {
      message.success("General purchase order created");
      await queryClient.invalidateQueries({
        queryKey: ["surface", "purchase_order_list"],
      });
      router.push(routes.purchaseOrders.detail(result.data.id));
      router.refresh();
    },
    onError: (err: Error) => message.error(err.message),
  });

  return (
    <div style={{ padding: 16, maxWidth: 480 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        New general purchase order
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Overhead, shop stock, and incidental buys with no job. Add freeform lines
        after create. For job material, use{" "}
        <Link href={routes.requisitions.list}>Requisitions</Link> instead.
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => createMutation.mutate(values)}
      >
        <Form.Item
          name="vendor_party_id"
          label="Vendor"
          rules={[{ required: true, message: "Pick a vendor" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={vendorsQuery.isLoading}
            placeholder="Select vendor"
            options={vendors.map((v) => ({
              value: v.id,
              label: v.display_name,
            }))}
          />
        </Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
          >
            Create
          </Button>
          <Link href={routes.purchaseOrders.list}>
            <Button>Cancel</Button>
          </Link>
        </Space>
      </Form>
    </div>
  );
};
