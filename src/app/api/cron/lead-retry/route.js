// Повторная доставка заявок, которые не дошли до Telegram (задача №03) — страховочный крон.
// На тарифе Vercel Hobby кроны разрешены только раз в сутки, поэтому основной повтор идёт
// не отсюда: retryUndelivered() вызывается при каждой новой заявке (см. api/lead).
// Заявка в базе есть в любом случае — здесь только чинится уведомление.
import { supa } from "@/lib/supabase";
import { retryUndelivered } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req) {
  // Fail-closed: без CRON_SECRET эндпоинт закрыт — иначе любой мог бы дёргать рассылку.
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.get("authorization") || "") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!supa) return Response.json({ ok: false, error: "not_configured" });
  return Response.json({ ok: true, ...(await retryUndelivered(50)) });
}

export async function GET(req) { return run(req); }
export async function POST(req) { return run(req); }
