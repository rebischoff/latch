import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "latch-crm",
    phase: "crm-step-a",
    database: {
      configured: isDatabaseConfigured(),
      connected: false,
    },
  });
}
