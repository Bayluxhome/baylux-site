// Подборки для клиентов (задача №07): серверные помощники.
// Права проверяются здесь и в API, а не в интерфейсе: править может только владелец
// (или супер-админ), смотреть по ссылке — кто угодно, пока подборка включена.
import { randomBytes } from "crypto";
import { supa } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/session";

export const MAX_ITEMS = 60;

export function newToken() {
  // 12 символов base64url ≈ 72 бита — подобрать перебором нереально.
  return randomBytes(9).toString("base64url");
}

export function isOwner(session, c) {
  if (!session || !c) return false;
  if (isSuperAdmin(session)) return true;
  if (session.id != null && c.owner_tg != null && String(c.owner_tg) === String(session.id)) return true;
  if (session.email && c.owner_email && c.owner_email.toLowerCase() === String(session.email).toLowerCase()) return true;
  return false;
}

export async function listMine(session) {
  if (!supa || !session) return [];
  let q = supa.from("collections").select("*").order("updated_at", { ascending: false }).limit(200);
  q = session.id != null ? q.eq("owner_tg", session.id) : q.eq("owner_email", session.email);
  const { data } = await q;
  return data || [];
}

export async function getById(id) {
  if (!supa || !id) return null;
  const { data } = await supa.from("collections").select("*").eq("id", id).maybeSingle();
  return data || null;
}

export async function getByToken(token) {
  if (!supa || !token || !/^[A-Za-z0-9_-]{8,32}$/.test(token)) return null;
  const { data } = await supa.from("collections").select("*").eq("token", token).maybeSingle();
  return data || null;
}

// Нормализация контакта клиента: телефон — цифры с кодом страны; ник — без @.
export function normClient(b) {
  const digits = String(b.client_phone || "").replace(/\D/g, "");
  let phone = "";
  if (digits.length === 9 && "534".includes(digits[0])) phone = "995" + digits;
  else if (digits.length >= 10 && digits.length <= 15) phone = digits;
  return {
    client_name: String(b.client_name || "").trim().slice(0, 120) || null,
    client_phone: phone || null,
    client_tg: String(b.client_tg || "").trim().replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 32) || null,
  };
}

// Снимок объекта в подборке — только публичные поля, ничего служебного.
export function itemSnapshot(u) {
  return { id: String(u.id), slug: u.slug, title: `${u.type || ""}${u.area ? `, ${u.area} м²` : ""} — ${u.building?.name || ""}`.trim() };
}
