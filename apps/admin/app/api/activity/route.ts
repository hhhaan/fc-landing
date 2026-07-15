import { jsonOk } from "@/shared/lib/api-handler";
import { getActivityData } from "@/shared/api/activity/server";

export async function GET() {
  return jsonOk(() => getActivityData());
}
