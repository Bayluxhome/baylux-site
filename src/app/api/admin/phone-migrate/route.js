// Разовая миграция: старый корпоративный номер в объявлениях → единый номер компании (14.09.2026).
// GET  /api/admin/phone-migrate            → сухой прогон, НИЧЕГО не пишет
// POST /api/admin/phone-migrate?live=1     → запись
// Только суперадмин. Трогаем ТОЛЬКО поля contact/phone со старым корпоративным номером:
// личные номера риелторов и owner_phone (контакт собственника) не затрагиваются.
import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa, fetchAll } from "@/lib/supabase";
import { PHONE } from "@/config";
import { revalidateListings } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OLD_DIGITS = "995706070305";               // номер Zadarma, от которого отказались
const NEW_PHONE = "+" + PHONE;                   // единый номер из config.js
const digits = (v) => String(v || "").replace(/\D/g, "");

async function run(req, write) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

  const live = write && new URL(req.url).searchParams.get("live") === "1";
  const rows = await fetchAll("listings", "id, status, phone, contact, owner_phone", (q) => q.order("id", { ascending: true }));

  const targets = [];
  const byStatus = {};
  let otherPhones = 0;
  for (const r of rows) {
    const hitPhone = digits(r.phone) === OLD_DIGITS;
    const hitContact = digits(r.contact) === OLD_DIGITS;
    if (!hitPhone && !hitContact) {
      if (digits(r.phone) || digits(r.contact)) otherPhones++;
      continue;
    }
    targets.push({ id: r.id, phone: hitPhone, contact: hitContact });
    byStatus[r.status || "?"] = (byStatus[r.status || "?"] || 0) + 1;
  }

  // Защита: owner_phone (реальный контакт собственника) не трогаем — считаем, сколько таких совпадений,
  // чтобы видеть, что мы их осознанно пропускаем.
  const ownerPhoneSame = rows.filter((r) => digits(r.owner_phone) === OLD_DIGITS).length;

  let updated = 0;
  if (live && targets.length) {
    const ids = targets.map((t) => t.id);
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error } = await supa.from("listings").update({ phone: NEW_PHONE, contact: NEW_PHONE }).in("id", chunk);
      if (error) return Response.json({ ok: false, error: error.message, updatedBeforeError: updated }, { status: 500 });
      updated += chunk.length;
    }
    revalidateListings();
  }

  return Response.json({
    ok: true,
    mode: live ? "LIVE (записано)" : "dry-run (ничего не записано)",
    from: "+" + OLD_DIGITS,
    to: NEW_PHONE,
    totalListings: rows.length,
    toChange: targets.length,
    byStatus,
    withOtherPhones: otherPhones,     // личные номера риелторов — не трогаем
    ownerPhoneSkipped: ownerPhoneSame, // owner_phone со старым номером — намеренно не меняем
    updated,
    samples: targets.slice(0, 10),
  });
}

export async function GET(req) { return run(req, false); }
export async function POST(req) { return run(req, true); }
