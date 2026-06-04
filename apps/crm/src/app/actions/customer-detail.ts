"use server";

import { LatchError } from "@latch/contracts";
import type { ProjectedCustomerDetail } from "@/lib/customers/project";
import { revalidatePath } from "next/cache";

import { getCustomersDal, resolveContextFresh } from "@/lib/latch";

export type CustomerDetailActionResult =
  | { ok: true; customer?: ProjectedCustomerDetail }
  | { ok: false; error: string };

const revalidateCustomers = (customerId: string): void => {
  revalidatePath("/customers", "page");
  revalidatePath(`/customers?id=${customerId}`, "page");
};

export const saveCustomerDetail = async (
  customerId: string,
  body: unknown,
): Promise<CustomerDetailActionResult> => {
  try {
    const ctx = await resolveContextFresh({
      surfaceId: "customer_detail",
      entityId: customerId,
    });
    const customer = await getCustomersDal().patch(ctx, customerId, body);
    revalidateCustomers(customerId);
    return { ok: true, customer };
  } catch (error) {
    if (error instanceof LatchError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
};
