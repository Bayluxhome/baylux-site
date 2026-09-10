import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import LoginBlock from "@/components/LoginBlock";
import CabinetDashboard from "@/components/CabinetDashboard";
import { loadCabinet } from "@/data/cabinetLoad";
import { listClients } from "@/lib/clients";
import { getRole, canCrm } from "@/lib/roles";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Личный кабинет", robots: { index: false, follow: false } };

// Рабочий стол кабинета (задача №06, этап 1): показатели, «Требуют обновления», обращения,
// аналитика — и сводка по клиентам с ближайшими действиями. Разделы — в боковом меню.
export default async function MyPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const session = verifySession(cookies().get("bx_session")?.value);

  if (!session) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>{t("cab_title")}</h1>
        <p style={{ color: "var(--ink-soft)", margin: "12px 0 22px", lineHeight: 1.6 }}>{t("cab_login_p")}</p>
        <LoginBlock />
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 22 }}>{t("cab_bot_a")} <b>@baylux_leads_bot</b> {t("cab_bot_b")}</p>
      </div>
    );
  }

  const d = await loadCabinet(session, lang);
  // Блок клиентов — только риелтору/сотруднику; обычный пользователь CRM не видит (и API ему её не отдаст).
  const crm = canCrm(await getRole(session));
  const clients = crm ? await listClients(session) : [];
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const due = clients.filter((c) => c.next_action_at && new Date(c.next_action_at) <= today && !["won", "lost"].includes(c.stage))
    .sort((a, b) => new Date(a.next_action_at) - new Date(b.next_action_at)).slice(0, 6);
  const objects = d.ownItems.map((o) => ({ id: o.id, title: o.title, sub: o.sub, photo: o.photo, status: o.status, slug: o.slug }));
  const fmt = (iso) => { try { return new Date(iso).toLocaleString(lang === "ka" ? "ka-GE" : lang === "en" ? "en-GB" : "ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

  return (
    <div>
      <div className="cabsh-head">
        <div>
          <h1>{t("cab_nav_dash")}</h1>
          <p>{session.name ? session.name + " — " : ""}{t("cab_objs")} ({d.rows.length}). {t("cab_addnew")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-gold" href="/add-holiday">🏠 {t("cab_hh_btn")}</Link>
          <Link className="btn btn-ghost" href="/my/bulk">{t("cab_bulk")}</Link>
          {(d.canMng || d.managedItems.length > 0) && <Link className="btn btn-ghost" href="/admin/reports">📊 {t("adm_reports_btn")}</Link>}
        </div>
      </div>

      <CabinetDashboard stats={d.dashStats} stale={d.stale} leads={d.leads} series={d.series} objects={objects.slice(0, 6)} />

      {crm && <div className="cab-card" style={{ marginTop: 16 }}>
        <div className="cab-h"><h2>{t("cl_today_h")}</h2><Link className="cab-ed" href="/my/clients">{t("cl_all")} →</Link></div>
        {due.length === 0 ? <p className="cab-empty">{clients.length ? t("cl_today_empty") : t("cl_empty")}</p> : due.map((c) => (
          <div className="cab-lead" key={c.id}>
            <div className="cab-av">{(c.name || "?").slice(0, 1).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div className="cab-nm"><Link href={`/my/clients/${c.id}`} style={{ color: "var(--navy)" }}>{c.name}</Link></div>
              <div className="cab-ds">{c.next_action || "—"}</div>
            </div>
            <div className="cab-rt"><div className="cab-tm">{fmt(c.next_action_at)}</div><span className="cab-tag cab-tag-soft">{t("cl_stage_" + c.stage)}</span></div>
          </div>
        ))}
      </div>}
    </div>
  );
}
