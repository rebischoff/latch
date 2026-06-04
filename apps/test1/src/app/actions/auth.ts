"use server";

import { APIError } from "@better-auth/core/error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { ensureDevUser } from "@/lib/auth/ensure-dev-user";

export type SignInState = {
  error?: string;
};

/** Post-login landing — app home until `/contacts` exists (task 12). */
const POST_LOGIN_PATH = "/";

export const signInAction = async (
  formData: FormData,
): Promise<SignInState | void> => {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  await ensureDevUser();

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  redirect(POST_LOGIN_PATH);
};

export const signOutAction = async (): Promise<void> => {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/login");
};
