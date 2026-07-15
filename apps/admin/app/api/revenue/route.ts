import { jsonOk } from "@/shared/lib/api-handler";
import { getRevenueData } from "@/shared/api/revenue/server";

export async function GET() {
  return jsonOk(() => getRevenueData());
}
