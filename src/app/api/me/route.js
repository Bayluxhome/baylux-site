import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = verifySession(cookies().get("bx_session")?.value);
  return Response.json({ in: !!s, name: s ? (s.name || s.username || "") : "", admin: isAdmin(s) });
}
