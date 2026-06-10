"use server";

import { revalidatePath } from "next/cache";

import { setActAsPrincipalId } from "@/lib/act-as";

export const setActAsAction = async (userId: string): Promise<void> => {
  await setActAsPrincipalId(userId);
  revalidatePath("/", "layout");
};
