import { cookies } from "next/headers";
import { verifySession, isAdmin, isSuperAdmin, can } from "@/lib/session";
import { supa } from "@/lib/supabase";
import AdminMenu from "@/components/AdminMenu";

// Общий каркас админки (T-20261128-02): меню в строки РАБОТА / АДМИНКА над каждой страницей /admin/*.
// Права для меню считает сервер; сами страницы проверяют доступ независимо.
export default async function AdminLayout({ children }) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isAdmin(session)) return children;
  const flags = {
    super: isSuperAdmin(session),
    moderate: can(session, "moderate"),
    leads: can(session, "leads"),
    news: can(session, "news"),
    complexes: can(session, "complexes"),
    realtors: can(session, "realtors"),
    users: can(session, "users"),
  };
  // Счётчик новых заявок на кнопке «Заявки» — один лёгкий запрос (head + count).
  let leadsNew = 0;
  if (flags.leads && supa) {
    try {
      const { count } = await supa.from("leads").select("id", { count: "exact", head: true }).eq("status", "new");
      leadsNew = count || 0;
    } catch { /* без счётчика */ }
  }
  return (
    <>
      <AdminMenu flags={flags} leadsNew={leadsNew} />
      {children}
    </>
  );
}
