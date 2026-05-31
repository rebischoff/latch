import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "latch_session";

export type SessionPayload = {
  userId: string;
  roles: string[];
  label: string;
};

const isSessionPayload = (value: unknown): value is SessionPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.userId === "string" &&
    Array.isArray(record.roles) &&
    record.roles.every((r) => typeof r === "string") &&
    typeof record.label === "string"
  );
};

export const readSessionCookie = async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSessionPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const setSessionCookie = async (session: SessionPayload): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
};

export const clearSessionCookie = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
};
