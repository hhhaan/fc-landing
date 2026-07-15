import { jsonOk } from "@/shared/lib/api-handler";
import { getOverviewData } from "@/shared/api/kpis/server";

export async function GET() {
  return jsonOk(() => getOverviewData());
}
