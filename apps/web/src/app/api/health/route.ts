import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "latch",
    phase: "0-scaffold",
    database: {
      configured: isDatabaseConfigured(),
      connected: false,
    },
  });
}
