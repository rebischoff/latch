import { NextResponse } from "next/server";
import { z } from "zod";

import { passwordFieldSchema } from "@/lib/auth-password";
import { compareSetupToken } from "@/lib/setup-token";
import { completeSetup, SetupNotAllowedError } from "@/lib/setup";

const setupBodySchema = z
  .object({
    token: z.string().min(1, "Setup token is required"),
    login_name: z
      .string()
      .min(2, "Login name must be at least 2 characters")
      .max(64, "Login name must be at most 64 characters")
      .refine(
        (value) =>
          /^[a-zA-Z0-9._-]+$/.test(value) ||
          z.string().email().safeParse(value).success,
        "Use letters, numbers, dots, underscores, hyphens, or a valid email",
      ),
    password: passwordFieldSchema(),
    password_confirm: passwordFieldSchema("Confirm password"),
  })
  .refine((body) => body.password === body.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
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

  const parsed = setupBodySchema.safeParse(json);
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

  const expectedToken = process.env.LATCH_SETUP_KEY?.trim();
  if (!compareSetupToken(parsed.data.token, expectedToken)) {
    return NextResponse.json(
      { error: { message: "Invalid setup token" } },
      { status: 403 },
    );
  }

  try {
    const result = await completeSetup({
      loginName: parsed.data.login_name.trim(),
      password: parsed.data.password,
    });

    return NextResponse.json({
      data: {
        userId: result.userId,
        redirectTo: "/login",
      },
    });
  } catch (error) {
    if (error instanceof SetupNotAllowedError) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: { message: "Login name is already taken" } },
        { status: 409 },
      );
    }

    console.error("Setup failed", error);
    return NextResponse.json(
      { error: { message: "Setup failed" } },
      { status: 500 },
    );
  }
};
