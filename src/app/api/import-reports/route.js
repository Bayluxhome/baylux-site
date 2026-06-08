import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { supa } from "@/lib/supabase";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NUM = (v) => {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".").replace(/[^\d.\-]/g, ""));
  return isFinite(n) ? n : null;
};
function normPeriod(v) {
  if (v == null) return "";
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})$/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[./](\d{4})$/); if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{4})[./](\d{1,2})$/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  return s;
}
function pick(row, re) { for (const k of Object.keys(row)) if (re.test(k)) return row[k]; return undefined; }

// Импорт XLS/CSV сводки. Один файл на все квартиры (по внутр. номеру и месяцу). Только право managed.
export async function POST(req) {
  const s = verifySession(cookies().get("bx_session")?.value);
  if (!can(s, "managed")) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  const form = await req.formData();
  const f = form.get("file");
  if (!f || typeof f.arrayBuffer !== "function") return Response.json({ ok: false, error: "file" }, { status: 400 });

  let rows;
  try {
    const wb = XLSX.read(Buffer.from(await f.arrayBuffer()), { type: "buffer" });
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  } catch (e) { return Response.json({ ok: false, error: "parse" }, { status: 400 }); }
  if (!rows.length) return Response.json({ ok: false, error: "empty" }, { status: 400 });

  const { data: lst } = await supa.from("listings").select("id, internal_no").eq("managed_by_baylux", true);
  const byNo = {};
  (lst || []).forEach((l) => { if (l.internal_no) byNo[String(l.internal_no).trim().toLowerCase()] = String(l.id); });

  const toUpsert = [];
  const skipped = [];
  for (const row of rows) {
    const no = (pick(row, /внутр|internal|номер|\bno\b/i) ?? "").toString().trim();
    const period = normPeriod(pick(row, /месяц|month|период|period/i));
    if (!no || !period) { skipped.push({ no, reason: "no_key" }); continue; }
    const lid = byNo[no.toLowerCase()];
    if (!lid) { skipped.push({ no, reason: "not_found" }); continue; }
    const noteV = pick(row, /заметк|note|коммент|comment/i);
    toUpsert.push({
      listing_id: lid, period,
      income: NUM(pick(row, /доход|income|выручк|gross/i)),
      payout: NUM(pick(row, /выплач|payout|владельц|owner/i)),
      commission: NUM(pick(row, /комисси|commission|\bfee\b/i)),
      utilities: NUM(pick(row, /коммунал|utilit|жку/i)),
      expenses: NUM(pick(row, /расход|expense|затрат/i)),
      note: noteV == null || noteV === "" ? null : String(noteV).slice(0, 500),
      updated_at: new Date().toISOString(),
    });
  }

  let imported = 0;
  if (toUpsert.length) {
    const { error } = await supa.from("management_reports").upsert(toUpsert, { onConflict: "listing_id,period" });
    if (error) return Response.json({ ok: false, error: "db", detail: error.message }, { status: 500 });
    imported = toUpsert.length;
  }
  return Response.json({ ok: true, imported, skipped: skipped.slice(0, 50), total: rows.length });
}
