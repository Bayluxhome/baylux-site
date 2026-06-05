import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Пользователи — Админ", robots: { index: false, follow: false } };

function fmt(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

export default async function AdminUsersPage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isAdmin(session)) redirect("/admin");

  let users = [];
  if (supa) {
    const { data } = await supa.from("site_users").select("*").order("created_at", { ascending: false });
    users = data || [];
    // Телефон (для TG — из таблицы users, куда он попадает при публикации) и число объявлений.
    const { data: tgUsers } = await supa.from("users").select("tg_user_id, phone");
    const phoneByTg = {};
    (tgUsers || []).forEach((u) => { if (u.tg_user_id != null && u.phone) phoneByTg[String(u.tg_user_id)] = u.phone; });
    const { data: lst } = await supa.from("listings").select("owner_email, tg_user_id");
    const byEmail = {}, byTg = {};
    (lst || []).forEach((l) => {
      if (l.owner_email) { const k = String(l.owner_email).toLowerCase(); byEmail[k] = (byEmail[k] || 0) + 1; }
      if (l.tg_user_id != null) { const k = String(l.tg_user_id); byTg[k] = (byTg[k] || 0) + 1; }
    });
    users = users.map((u) => ({
      ...u,
      phone: u.phone || (u.tg_user_id != null ? phoneByTg[String(u.tg_user_id)] : "") || "",
      listings: u.tg_user_id != null ? (byTg[String(u.tg_user_id)] || 0) : (byEmail[String(u.email || "").toLowerCase()] || 0),
    }));
  }

  const th = { padding: "10px 12px", whiteSpace: "nowrap" };
  const td = { padding: "10px 12px", borderTop: "1px solid var(--line)" };

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div className="crumbs"><Link href="/admin">← Админ-панель</Link></div>
      <h1 style={{ color: "var(--navy)", marginTop: 8 }}>Пользователи</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 20px" }}>Всего {users.length}</p>
      {users.length === 0 ? (
        <p style={{ color: "var(--ink-soft)" }}>Пока нет записей. Новые входы (по email и Telegram) будут появляться здесь автоматически.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 760 }}>
            <thead>
              <tr style={{ background: "var(--navy)", color: "#fff", textAlign: "left" }}>
                <th style={th}>Контакт</th>
                <th style={th}>Имя</th>
                <th style={th}>Телефон</th>
                <th style={th}>Объявл.</th>
                <th style={th}>Регистрация</th>
                <th style={th}>Последний вход</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={td}>{u.email ? `✉️ ${u.email}` : u.username ? `✈️ @${u.username}` : (u.tg_user_id ? `✈️ tg:${u.tg_user_id}` : "—")}</td>
                  <td style={td}>{u.name || "—"}</td>
                  <td style={td}>{u.phone || "—"}</td>
                  <td style={td}>{u.listings}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmt(u.created_at)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmt(u.last_login)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
