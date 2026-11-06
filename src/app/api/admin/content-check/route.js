// 06.11.2026: диагностика автопроверки фото (только модераторы). GET ?url=<картинка> → причины.
import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { photoVerdict, contentCheckInfo } from "@/lib/contentCheck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "moderate")) return Response.json({ ok: false }, { status: 403 });
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !/^https:\/\//.test(url)) return Response.json({ ok: false, error: "url" }, { status: 400 });
  const model = new URL(req.url).searchParams.get("model") || undefined;
  const t0 = Date.now();
  const reasons = await photoVerdict([url], { model });
  return Response.json({ ok: true, reasons, ms: Date.now() - t0, model: model || null, ...contentCheckInfo() });
}
