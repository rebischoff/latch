import { NextResponse } from "next/server";
import { z } from "zod";

import { signInWithLatchCredentials } from "@latch/adapter-better-auth";

import { loginPasswordFieldSchema } from "@/lib/auth-password";
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

  return signInWithLatchCredentials(getAuth(), getPool(), {
    identifier: parsed.data.identifier,
    password: parsed.data.password,
    rememberMe: parsed.data.rememberMe,
    request,
  });
};
