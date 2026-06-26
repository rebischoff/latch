import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authCredentialLookupKeys,
  signInWithLatchCredentials,
  toAuthCredentialEmail,
} from "@latch/adapter-better-auth";

import { loginPasswordFieldSchema } from "@/lib/auth-password";
import { routes } from "@/lib/nav-routes";
import { getAuth, getPool } from "@/lib/latch";

const loginBodySchema = z.object({
  identifier: z.string().min(1, "Enter your login name or email"),
  password: loginPasswordFieldSchema(),
  rememberMe: z.boolean().optional(),
});

export const POST = async (request: Request): Promise<Response> => {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = loginBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          message: "Validation failed",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  const pool = getPool();
  const response = await signInWithLatchCredentials(getAuth(), pool, {
    identifier: parsed.data.identifier,
    password: parsed.data.password,
    rememberMe: parsed.data.rememberMe,
    request,
  });

  if (!response.ok) {
    return response;
  }

  const credentialEmail = toAuthCredentialEmail(parsed.data.identifier);
  let mustChangePassword = false;

  for (const key of authCredentialLookupKeys(credentialEmail)) {
    const flagResult = await pool.query<{ must_change_password: boolean }>(
      `SELECT must_change_password
       FROM latch_users
       WHERE login_name = $1 OR login_email = $1
       LIMIT 1`,
      [key],
    );
    if (flagResult.rows[0]) {
      mustChangePassword = flagResult.rows[0].must_change_password;
      break;
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // Better Auth may return an empty body on success.
  }

  const headers = new Headers(response.headers);
  return NextResponse.json(
    {
      ...body,
      mustChangePassword,
      redirectTo: mustChangePassword
        ? routes.changePasswordRequired
        : undefined,
    },
    { headers, status: response.status },
  );
};
