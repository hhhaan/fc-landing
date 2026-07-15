import { jsonOk } from "@/shared/lib/api-handler";
import { getSystemData } from "@/shared/api/system/server";

export async function GET() {
  return jsonOk(() => getSystemData());
}
