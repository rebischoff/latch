"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth/auth";

export type LoginState = {
  error?: string;
};

/** Direct server action (not useActionState) so redirect() navigates correctly. */
export const loginAction = async (
  formData: FormData,
): Promise<LoginState | void> => {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const result = await signIn("credentials", {
    username,
    password,
    redirect: false,
  });

  if (result?.error) {
    return { error: "Invalid username or password." };
  }

  redirect("/jobs");
};
