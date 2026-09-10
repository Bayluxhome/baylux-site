// Клиенты риелтора (кабинет, этап 1). Права — здесь и в API, по серверной сессии.
import { supa, fetchAll } from "@/lib/supabase";
import { isSuperAdmin, can } from "@/lib/session";

// Этапы работы с клиентом (единый список, см. ТЗ №06). Подписи — в dict: cl_stage_<key>.
export const STAGES = ["new", "contact", "selection", "viewing", "negotiation", "deposit", "contract", "won", "lost"];
export const SOURCES = ["site", "telegram", "whatsapp", "call", "referral", "other"];

// Кто видит всех клиентов: супер-админ и сотрудник с правом «Заявки клиентов».
export const seesAll = (s) => !!s && (isSuperAdmin(s) || can(s, "leads"));

export function ownsClient(session, c) {
  if (!session || !c) return false;
  if (seesAll(session)) return true;
  if (session.id != null && c.owner_tg != null && String(c.owner_tg) === String(session.id)) return true;
  if (session.email && c.owner_email && c.owner_email.toLowerCase() === String(session.email).toLowerCase()) return true;
  return false;
}

export async function listClients(session) {
  if (!supa || !session) return [];
  return fetchAll("clients", "*", (q) => {
    q = q.order("updated_at", { ascending: false });
    if (seesAll(session)) return q;
    return session.id != null ? q.eq("owner_tg", session.id) : q.eq("owner_email", session.email);
  });
}

export async function getClient(id) {
  if (!supa || !id || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supa.from("clients").select("*").eq("id", id).maybeSingle();
  return data || null;
}

export function normPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 9 && "534".includes(d[0])) return "995" + d;
  if (d.length >= 10 && d.length <= 15) return d;
  return "";
}

// Поля, которые можно менять через API, с нормализацией.
export function normClientFields(b) {
  const out = {};
  if (b.name !== undefined) out.name = String(b.name || "").trim().slice(0, 120);
  if (b.phone !== undefined) out.phone = normPhone(b.phone) || null;
  if (b.tg !== undefined) out.tg = String(b.tg || "").trim().replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 32) || null;
  if (b.email !== undefined) out.email = String(b.email || "").trim().toLowerCase().slice(0, 120) || null;
  if (b.source !== undefined) out.source = SOURCES.includes(b.source) ? b.source : null;
  if (b.lang !== undefined) out.lang = ["ru", "en", "ka"].includes(b.lang) ? b.lang : null;
  if (b.req_city !== undefined) out.req_city = String(b.req_city || "").trim().slice(0, 80) || null;
  if (b.req_deal !== undefined) out.req_deal = ["sale", "rent", "daily"].includes(b.req_deal) ? b.req_deal : null;
  if (b.req_type !== undefined) out.req_type = String(b.req_type || "").trim().slice(0, 60) || null;
  if (b.req_budget_min !== undefined) out.req_budget_min = Number(String(b.req_budget_min).replace(/[^\d.]/g, "")) || null;
  if (b.req_budget_max !== undefined) out.req_budget_max = Number(String(b.req_budget_max).replace(/[^\d.]/g, "")) || null;
  if (b.req_currency !== undefined) out.req_currency = b.req_currency === "GEL" ? "GEL" : "USD";
  if (b.req_notes !== undefined) out.req_notes = String(b.req_notes || "").trim().slice(0, 2000) || null;
  if (b.next_action !== undefined) out.next_action = String(b.next_action || "").trim().slice(0, 200) || null;
  if (b.next_action_at !== undefined) { const d = b.next_action_at ? new Date(b.next_action_at) : null; out.next_action_at = d && !isNaN(d) ? d.toISOString() : null; }
  if (b.stage !== undefined) out.stage = STAGES.includes(b.stage) ? b.stage : "new";
  return out;
}

// Публичная форма клиента для интерфейса (ничего лишнего, ответственный — как подпись).
export function pubClient(c) {
  return {
    id: c.id, name: c.name, phone: c.phone, tg: c.tg, email: c.email, source: c.source, lang: c.lang,
    req_city: c.req_city, req_deal: c.req_deal, req_type: c.req_type, req_budget_min: c.req_budget_min, req_budget_max: c.req_budget_max,
    req_currency: c.req_currency, req_notes: c.req_notes, next_action: c.next_action, next_action_at: c.next_action_at, stage: c.stage,
    owner: c.owner_email || (c.owner_tg != null ? "tg:" + c.owner_tg : ""),
    created_at: c.created_at, updated_at: c.updated_at,
  };
}
