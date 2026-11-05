import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { loadAdminListings } from "@/lib/adminListings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Страницы списка объявлений для админки (фильтры и «Показать ещё» без перезагрузки всей базы в браузер).
export async function GET(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "moderate")) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  const u = new URL(req.url);
  const offset = Math.max(0, parseInt(u.searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(u.searchParams.get("limit") || "100", 10) || 100));
  const status = u.searchParams.get("status") || "all";
  const source = u.searchParams.get("source") || "all";
  const data = await loadAdminListings({ offset, limit, status, source, canSeeOwner: true });
  return Response.json({ ok: true, ...data });
}
