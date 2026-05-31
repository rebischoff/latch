"use server";

import { redirect } from "next/navigation";

import { getDevPassword, lookupUser } from "@/lib/auth/users";
import { setSessionCookie } from "@/lib/auth/session";

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

  const user = lookupUser(username);
  if (!user || password !== getDevPassword()) {
    return { error: "Invalid username or password." };
  }

  await setSessionCookie({
    userId: user.id,
    roles: user.roles,
    label: user.label,
  });

  redirect("/jobs");
};
