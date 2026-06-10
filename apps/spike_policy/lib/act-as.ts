import { cookies } from "next/headers";

const COOKIE_NAME = "latch-act-as";
export const DEFAULT_ACT_AS_ID = "bootstrap-admin";

/** Dev-only principal id for server actions (no production auth). */
export const getActAsPrincipalId = async (): Promise<string> => {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? DEFAULT_ACT_AS_ID;
};

export const setActAsPrincipalId = async (userId: string): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
};
