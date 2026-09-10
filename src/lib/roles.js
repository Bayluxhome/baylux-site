// Роль в кабинете (задача «кабинет обычного пользователя»). Определяется ТОЛЬКО на сервере:
//   staff   — сотрудник с правами (perms) или супер-админ;
//   realtor — пользователь с подтверждённым профилем риелтора (realtors.status = approved);
//   user    — обычный зарегистрированный пользователь / собственник.
// Роль «риелтор» не выдаётся при регистрации: её даёт одобрение заявки в админке.
// CRM-разделы (клиенты, подборки) — только realtor и staff; проверяется и в layout, и в API.
import { supa } from "@/lib/supabase";
import { isAdmin } from "@/lib/session";

export async function getRole(session) {
  if (!session) return null;
  if (isAdmin(session)) return "staff";
  if (!supa) return "user";
  let q = supa.from("realtors").select("id").eq("status", "approved");
  q = session.id != null ? q.eq("tg_user_id", session.id) : q.ilike("email", String(session.email || ""));
  const { data } = await q.maybeSingle();
  return data ? "realtor" : "user";
}

export const canCrm = (role) => role === "realtor" || role === "staff";
