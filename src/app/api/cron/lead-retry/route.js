// Повторная доставка заявок, которые не дошли до Telegram (задача №03).
// Раз в час: берём заявки без notified_at (до 10 попыток, не старше 3 дней) и шлём заново.
// Заявка в базе есть в любом случае — крон только чинит уведомление.
import { supa } from "@/lib/supabase";
import { deliverLead, listingForLead } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ATTEMPTS = 10;
const MAX_AGE_DAYS = 3;

async function run(req) {
  // Fail-closed: без CRON_SECRET эндпоинт закрыт — иначе любой мог бы дёргать рассылку.
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.get("authorization") || "") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!supa) return Response.json({ ok: false, error: "not_configured" });

  const since = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString();
  const { data: rows } = await supa
    .from("leads").select("*")
    .is("notified_at", null).lt("notify_attempts", MAX_ATTEMPTS).gte("created_at", since)
    .order("created_at", { ascending: true }).limit(50);

  let delivered = 0, failed = 0;
  for (const lead of rows || []) {
    const listing = await listingForLead(lead.listing_id);
    const res = await deliverLead(lead, listing);
    if (res.delivered > 0) delivered++; else failed++;
  }
  return Response.json({ ok: true, pending: (rows || []).length, delivered, failed });
}

export async function GET(req) { return run(req); }
export async function POST(req) { return run(req); }
