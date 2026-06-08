import { cookies } from "next/headers";
import { verifySession, isAdmin, can } from "@/lib/session";
import { PERMISSION_KEYS } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = verifySession(cookies().get("bx_session")?.value);
  const perms = {};
  for (const k of PERMISSION_KEYS) perms[k] = can(s, k);
  return Response.json({ in: !!s, name: s ? (s.name || s.username || "") : "", admin: isAdmin(s), perms });
}
