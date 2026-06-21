import { createAuthRouteHandlers } from "@latch/adapter-better-auth";

import { getAuth } from "../../../../lib/latch";

export const { GET, POST } = createAuthRouteHandlers(getAuth);
