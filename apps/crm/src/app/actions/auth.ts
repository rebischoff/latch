"use server";

import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth/auth";

export const logoutAction = async (): Promise<void> => {
  await signOut({ redirect: false });
  redirect("/login");
};
