import { createAuthRouteHandlers } from "@latch/adapter-better-auth";

import { getAuth } from "../../../../lib/latch.js";

export const { GET, POST } = createAuthRouteHandlers(getAuth);
