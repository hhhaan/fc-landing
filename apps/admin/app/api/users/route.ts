import { jsonOk } from "@/shared/lib/api-handler";
import { getUsers } from "@/shared/api/users/server";

export async function GET() {
  return jsonOk(() => getUsers());
}
