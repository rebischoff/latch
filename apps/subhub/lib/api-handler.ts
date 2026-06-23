import { mapLatchError } from "@latch/app-kit";

import { InUseError } from "./errors";

export const withSubhubApiHandler = async (
  handler: () => Promise<Response>,
): Promise<Response> => {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof InUseError) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
            entity: error.entity,
            blockers: error.blockers,
          },
        },
        { status: error.statusCode },
      );
    }

    return mapLatchError(error);
  }
};
