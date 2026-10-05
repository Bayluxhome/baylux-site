import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, can } from "@/lib/session";
import { fetchAll } from "@/lib/supabase";
import { PHONE } from "@/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Аналитика — Админ", robots: { index: false, follow: false } };

// Аналитика площадки за период (05.10.2026): регистрации, риелторы, объявления, заявки,
// визиты и просмотры — из своей базы Supabase, без внешних счётчиков.
// Доступ — право «Пользователи» (те же люди, что видят список пользователей).
// Админка у нас только на русском (как остальные страницы /admin).

const PERIODS = [7, 30, 90];
const digits = (s) => String(s || "").replace(/\D/g, "");
const isAgency = (l) => { const d = digits(l.contact || l.phone); return !d || d.endsWith(PHONE.slice(-9)); };
const dayKey = (iso) => String(iso || "").slice(0, 10);
const fmtD = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

function count(rows, keyFn) {
  const m = new Map();
  for (const r of rows) { const k = keyFn(r) || "—"; m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function AdminAnalyticsPage({ searchParams }) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "users")) redirect("/admin");

  const days = PERIODS.includes(parseInt(searchParams?.days, 10)) ? parseInt(searchParams.days, 10) : 7;
  const since = new Date(Date.now() - days * 864e5);
  const sinceIso = since.toISOString();
  const gte = (col) => (q) => q.gte(col, sinceIso);

  // Каждый запрос — отдельно: если какой-то таблицы нет, остальные цифры всё равно покажем.
  const safe = (p) => p.catch(() => []);
  const [users, realtors, listings, leads, visits, views] = await Promise.all([
    safe(fetchAll("site_users", "id, email, tg_user_id, username, name, created_at, last_login", (q) => q.gte("created_at", sinceIso).order("created_at", { ascending: false }))),
    safe(fetchAll("realtors", "*", gte("created_at"))),
    safe(fetchAll("listings", "id, created_at, status, deal, district, contact, phone, owner_email, tg_user_id", gte("created_at"))),
    safe(fetchAll("leads", "id, created_at, type, source, status", gte("created_at"))),
    safe(fetchAll("site_visits", "visited_at, session_id, referrer, utm_source, device_type", gte("visited_at"))),
    safe(fetchAll("listing_views", "day, views", (q) => q.gte("day", sinceIso.slice(0, 10)))),
  ]);
  const activeUsers = await safe(fetchAll("site_users", "id", (q) => q.gte("last_login", sinceIso)));

  const ownListings = listings.filter((l) => !isAgency(l));
  const parsedListings = listings.filter(isAgency);
  const sessions = new Set(visits.map((v) => v.session_id).filter(Boolean));
  const viewsTotal = views.reduce((s, r) => s + (Number(r.views) || 0), 0);

  // По дням: регистрации, объявления риелторов/собственников, заявки, визиты.
  const dayList = [];
  for (let i = days - 1; i >= 0; i--) dayList.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  const perDay = (rows, col) => { const m = {}; rows.forEach((r) => { const k = dayKey(r[col]); m[k] = (m[k] || 0) + 1; }); return m; };
  const dU = perDay(users, "created_at"), dO = perDay(ownListings, "created_at"), dL = perDay(leads, "created_at"), dV = perDay(visits, "visited_at");

  const sources = count(visits, (v) => v.utm_source || host(v.referrer) || "прямой заход").slice(0, 10);
  const devices = count(visits, (v) => v.device_type);
  const leadTypes = count(leads, (l) => l.type);
  const listingCities = count(ownListings, (l) => l.district).slice(0, 8);

  const card = { background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px" };
  const kpi = (label, value, sub) => (
    <div style={card}>
      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--navy)", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const th = { padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap" };
  const td = { padding: "8px 10px", borderTop: "1px solid var(--line)" };
  const list = (title, rows) => (
    <div style={card}>
      <b style={{ color: "var(--navy)" }}>{title}</b>
      {rows.length === 0 ? <p style={{ color: "var(--ink-soft)", margin: "8px 0 0" }}>Нет данных</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 6 }}>
          <tbody>{rows.map(([k, v]) => <tr key={k}><td style={td}>{k}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{v}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div className="crumbs"><Link href="/admin">← Админ-панель</Link></div>
      <h1 style={{ color: "var(--navy)", marginTop: 8 }}>Аналитика</h1>
      <div style={{ display: "flex", gap: 8, margin: "10px 0 20px", flexWrap: "wrap", alignItems: "center" }}>
        {PERIODS.map((p) => (
          <a key={p} href={`?days=${p}`} className={p === days ? "btn btn-navy" : "btn btn-ghost"} style={{ padding: "7px 14px" }}>{p} дней</a>
        ))}
        <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>с {since.toLocaleDateString("ru-RU")} по сегодня</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {kpi("Новые регистрации", users.length, `${users.filter((u) => u.tg_user_id).length} через Telegram · ${users.filter((u) => u.email).length} по email`)}
        {kpi("Заходили в кабинет", activeUsers.length, "уникальные пользователи")}
        {kpi("Новые риелторы", realtors.length, `${realtors.filter((r) => r.status === "approved").length} одобрено`)}
        {kpi("Объявления от людей", ownListings.length, "риелторы и собственники")}
        {kpi("Объявления парсера", parsedListings.length, "из Telegram-групп")}
        {kpi("Заявки", leads.length, `${leads.filter((l) => l.status === "new").length} ещё новые`)}
        {kpi("Визиты", visits.length, `${sessions.size} сессий`)}
        {kpi("Просмотры объектов", viewsTotal, "карточки объявлений")}
      </div>

      <h3 style={{ color: "var(--navy)", margin: "26px 0 10px" }}>По дням</h3>
      <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 520 }}>
          <thead><tr style={{ background: "var(--navy)", color: "#fff" }}>
            <th style={th}>День</th><th style={th}>Регистрации</th><th style={th}>Объявления людей</th><th style={th}>Заявки</th><th style={th}>Визиты</th>
          </tr></thead>
          <tbody>{[...dayList].reverse().map((d) => (
            <tr key={d}><td style={td}>{fmtD(d)}</td><td style={td}>{dU[d] || 0}</td><td style={td}>{dO[d] || 0}</td><td style={td}>{dL[d] || 0}</td><td style={td}>{dV[d] || 0}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 20 }}>
        {list("Откуда приходят (визиты)", sources)}
        {list("Устройства", devices)}
        {list("Заявки по типу", leadTypes)}
        {list("Объявления людей по городам", listingCities)}
      </div>

      <h3 style={{ color: "var(--navy)", margin: "26px 0 10px" }}>Новые пользователи за период</h3>
      {users.length === 0 ? <p style={{ color: "var(--ink-soft)" }}>Нет регистраций за период.</p> : (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 520 }}>
            <thead><tr style={{ background: "var(--navy)", color: "#fff" }}><th style={th}>Контакт</th><th style={th}>Имя</th><th style={th}>Регистрация</th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id}>
                <td style={td}>{u.email ? `✉️ ${u.email}` : u.username ? `✈️ @${u.username}` : (u.tg_user_id ? `✈️ tg:${u.tg_user_id}` : "—")}</td>
                <td style={td}>{u.name || "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(u.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p style={{ color: "var(--ink-soft)", fontSize: 12, marginTop: 14 }}>
        Источник — база сайта. Визиты считаются с момента подключения счётчика визитов; объявления «людей» — все, где контакт не номер агентства.
      </p>
    </div>
  );
}
