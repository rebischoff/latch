import { NextResponse } from "next/server";
import { z } from "zod";

import { passwordFieldSchema } from "@/lib/auth-password";
import { isAuthenticated } from "@/lib/auth-session";
import {
  completeForcedPasswordChange,
  ForcedPasswordChangeNotRequiredError,
} from "@/lib/account/complete-forced-password-change";

const changePasswordRequiredBodySchema = z
  .object({
    password: passwordFieldSchema("New password"),
    password_confirm: passwordFieldSchema("Confirm password"),
  })
  .strict()
  .refine((body) => body.password === body.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  });

export const POST = async (request: Request): Promise<Response> => {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = changePasswordRequiredBodySchema.safeParse(json);
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

  try {
    await completeForcedPasswordChange(parsed.data.password);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof ForcedPasswordChangeNotRequiredError) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 409 },
      );
    }

    console.error("Forced password change failed", error);
    return NextResponse.json(
      { error: { message: "Password change failed" } },
      { status: 500 },
    );
  }
};
