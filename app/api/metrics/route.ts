import { metricsStore } from "@/lib/metrics";
import { metricRecordSchema } from "@/lib/metrics";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = metricRecordSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid metric record" }, { status: 400 });
  }

  await metricsStore.save(parsed.data);
  return Response.json({ ok: true });
}

export async function GET() {
  const stats = await metricsStore.getAggregatedStats();
  return Response.json({ stats });
}
