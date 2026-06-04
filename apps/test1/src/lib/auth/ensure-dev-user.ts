import { APIError } from "@better-auth/core/error";

import { auth } from "./auth";
import { DEV_LOGIN_EMAIL } from "./dev-login";

const devPassword = () => process.env.TEST1_DEV_PASSWORD ?? "demo";

/** Memory adapter clears on restart — recreate the dev user before sign-in. */
export const ensureDevUser = async (): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: DEV_LOGIN_EMAIL,
        password: devPassword(),
        name: "Admin (dev)",
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return;
    }
    throw error;
  }
};
