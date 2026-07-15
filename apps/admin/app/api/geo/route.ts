import { jsonOk } from "@/shared/lib/api-handler";
import { getGeoData } from "@/shared/api/geo/server";

export async function GET() {
  return jsonOk(() => getGeoData());
}
