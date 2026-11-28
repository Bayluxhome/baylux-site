import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, can } from "@/lib/session";
import { ADMIN_EMAILS } from "@/config";
import { supa } from "@/lib/supabase";
import { listingOwnerCounts } from "@/lib/adminListings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Пользователи — Админ", robots: { index: false, follow: false } };

function fmt(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

// «Люди» (28.11, T-20261128-02): один список — пользователи, риелторы, сотрудники; фильтр ?f=.
const FILTERS = [["all", "Все"], ["realtors", "Риелторы"], ["staff", "Сотрудники"], ["listings", "С объявлениями"]];

export default async function AdminUsersPage({ searchParams }) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "users")) redirect("/admin");

  let users = [];
  if (supa) {
    const { data } = await supa.from("site_users").select("*").order("created_at", { ascending: false });
    users = data || [];
    // Телефон (для TG — из таблицы users, куда он попадает при публикации) и число объявлений.
    const { data: tgUsers } = await supa.from("users").select("tg_user_id, phone");
    const phoneByTg = {};
    (tgUsers || []).forEach((u) => { if (u.tg_user_id != null && u.phone) phoneByTg[String(u.tg_user_id)] = u.phone; });
    const { byEmail, byTg } = await listingOwnerCounts(); // из общего кэша админки (28.11), а не отдельным чтением всех объявлений
    // Профили риелторов — отметка «риелтор» у пользователя (связь по Telegram-id или e-mail).
    const { data: rl } = await supa.from("realtors").select("email, tg_user_id, status");
    const rEmail = new Set(), rTg = new Set();
    (rl || []).forEach((r) => { if (r.status !== "approved") return; if (r.email) rEmail.add(String(r.email).toLowerCase()); if (r.tg_user_id != null) rTg.add(String(r.tg_user_id)); });
    users = users.map((u) => ({
      ...u,
      isRealtor: (u.tg_user_id != null && rTg.has(String(u.tg_user_id))) || (!!u.email && rEmail.has(String(u.email).toLowerCase())),
      isStaff: !!u.is_admin || (Array.isArray(u.permissions) && u.permissions.length > 0) || (!!u.email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(String(u.email).toLowerCase())),
      phone: u.phone || (u.tg_user_id != null ? phoneByTg[String(u.tg_user_id)] : "") || "",
      listings: u.tg_user_id != null ? (byTg[String(u.tg_user_id)] || 0) : (byEmail[String(u.email || "").toLowerCase()] || 0),
    }));
  }

  const f = FILTERS.some(([k]) => k === searchParams?.f) ? searchParams.f : "all";
  const totalAll = users.length;
  const cnt = { all: users.length, realtors: users.filter((u) => u.isRealtor).length, staff: users.filter((u) => u.isStaff).length, listings: users.filter((u) => u.listings > 0).length };
  if (f === "realtors") users = users.filter((u) => u.isRealtor);
  else if (f === "staff") users = users.filter((u) => u.isStaff);
  else if (f === "listings") users = users.filter((u) => u.listings > 0);

  const th = { padding: "10px 12px", whiteSpace: "nowrap" };
  const td = { padding: "10px 12px", borderTop: "1px solid var(--line)" };

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)", marginTop: 8 }}>Люди</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 12px" }}>Всего {totalAll}{f !== "all" ? ` · показано ${users.length}` : ""}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={k === "all" ? "/admin/users" : `/admin/users?f=${k}`} className={k === f ? "btn btn-navy" : "btn btn-ghost"} style={{ padding: "7px 14px" }}>{label} · {cnt[k]}</Link>
        ))}
      </div>
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
                  <td style={td}>{u.name || "—"}{u.isStaff ? <span className="cab-tag" style={{ marginLeft: 6 }}>сотрудник</span> : null}{u.isRealtor ? <span className="cab-tag cab-tag-soft" style={{ marginLeft: 6 }}>риелтор</span> : null}</td>
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
