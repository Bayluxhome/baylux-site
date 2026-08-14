"use client";
import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangContext";

// Дашборд кабинета: метрики, объекты с истекающей актуальностью, обращения и график.
// Данные реальные: просмотры — из listing_views, обращения — из leads (sql/017).
export default function CabinetDashboard({ stats, stale: staleInit, leads, series }) {
  const { t } = useLang();
  const [stale, setStale] = useState(staleInit || []);
  const [busy, setBusy] = useState(null);
  const [tab, setTab] = useState("views");

  // «Всё актуально» = продлить публикацию (bump): объявление снова висит 60 дней.
  async function confirmFresh(id) {
    setBusy(id);
    try {
      const r = await fetch("/api/my-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "bump" }),
      });
      const j = await r.json();
      if (j.ok) setStale((s) => s.map((x) => (x.id === id ? { ...x, done: true } : x)));
      else alert(t("cab_err"));
    } catch { alert(t("cab_err")); }
    setBusy(null);
  }

  const pts = series || [];
  const key = tab === "views" ? "views" : "leads";
  const max = Math.max(1, ...pts.map((p) => p[key]));
  const W = 320, H = 110;
  const step = pts.length > 1 ? W / (pts.length - 1) : W;
  const coords = pts.map((p, i) => [i * step, H - (p[key] / max) * (H - 14)]);
  const path = coords.map((c, i) => {
    if (i === 0) return `M${c[0].toFixed(1)},${c[1].toFixed(1)}`;
    const pr = coords[i - 1], cx = (pr[0] + c[0]) / 2;
    return `C${cx.toFixed(1)},${pr[1].toFixed(1)} ${cx.toFixed(1)},${c[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
  }).join(" ");

  const CARDS = [
    { k: "active", label: t("cab_m_active"), val: stats.active, note: t("cab_m_active_n") },
    { k: "stale", label: t("cab_m_stale"), val: stats.stale, note: t("cab_m_stale_n"), warn: true },
    { k: "views", label: t("cab_m_views"), val: stats.views, note: t("cab_m_views_n") },
    { k: "leads", label: t("cab_m_leads"), val: stats.leadsNew, note: t("cab_m_leads_n") },
  ];

  return (
    <div className="cab">
      <div className="cab-stats">
        {CARDS.map((c) => (
          <div className="cab-stat" key={c.k}>
            <div className="cab-lb">{c.label}</div>
            <div className="cab-vl">{c.val}</div>
            <div className={"cab-dt" + (c.warn && c.val > 0 ? " warn" : "")}>{c.note}</div>
          </div>
        ))}
      </div>

      <div className="cab-grid">
        <div>
          {stale.length > 0 && (
            <div className="cab-card">
              <div className="cab-h"><h2>{t("cab_stale_h")}</h2></div>
              <p className="cab-sub">{t("cab_stale_p")}</p>
              {stale.map((o) => (
                <div className="cab-upd" key={o.id}>
                  <img className="cab-ph" src={o.photo} alt="" />
                  <div className="cab-in">
                    <div className="cab-nm">{o.title}</div>
                    <div className="cab-ds">{o.sub}</div>
                    <div className={"cab-age" + (o.daysLeft <= 7 ? " soon" : "")}>
                      {o.done ? t("cab_confirmed") : `${t("cab_days_left")}: ${o.daysLeft}`}
                    </div>
                  </div>
                  <div className="cab-acts">
                    <button
                      className={"cab-ok" + (o.done ? " done" : "")}
                      disabled={busy === o.id || o.done}
                      onClick={() => confirmFresh(o.id)}
                    >
                      {busy === o.id ? "…" : o.done ? `✓ ${t("cab_confirmed")}` : `✓ ${t("cab_ok_btn")}`}
                    </button>
                    <Link className="cab-ed" href={`/my/edit/${o.id}`}>{t("cab_edit")}</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="cab-card">
            <div className="cab-h"><h2>{t("cab_leads_h")}</h2></div>
            {leads && leads.length ? leads.slice(0, 6).map((l) => (
              <div className="cab-lead" key={l.id}>
                <div className="cab-av">{(l.name || "?").slice(0, 1).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="cab-nm">{l.name || t("cab_noname")}</div>
                  <div className="cab-ds">{l.object_title || l.type || "—"}</div>
                  {l.phone && <a className="cab-tel" href={`tel:${l.phone}`}>📞 {l.phone}</a>}
                </div>
                <div className="cab-rt">
                  <div className="cab-tm">{timeAgo(l.created_at, t)}</div>
                  {l.status === "new" && <span className="cab-tag">{t("cab_lead_new")}</span>}
                </div>
              </div>
            )) : <p className="cab-empty">{t("cab_leads_empty")}</p>}
          </div>

          <div className="cab-card">
            <div className="cab-h"><h2>{t("cab_an_h")}</h2><span className="cab-per">{t("cab_30d")}</span></div>
            <div className="cab-tabs">
              <button className={tab === "views" ? "on" : ""} onClick={() => setTab("views")}>{t("cab_m_views")}</button>
              <button className={tab === "leads" ? "on" : ""} onClick={() => setTab("leads")}>{t("cab_an_leads")}</button>
            </div>
            <svg className="cab-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="cabg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#01274B" stopOpacity=".16" />
                  <stop offset="100%" stopColor="#01274B" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1={H} x2={W} y2={H} stroke="#E6E1D6" />
              {path && <>
                <path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#cabg)" />
                <path d={path} fill="none" stroke="#01274B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </>}
            </svg>
            <div className="cab-tot">
              <div><div className="cab-lb">{t("cab_m_views")}</div><div className="cab-vl2">{stats.views}</div></div>
              <div><div className="cab-lb">{t("cab_an_leads")}</div><div className="cab-vl2">{stats.leadsTotal}</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso, t) {
  if (!iso) return "";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return t("cab_now");
  if (min < 60) return `${min} ${t("cab_min")}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${t("cab_hour")}`;
  return `${Math.floor(h / 24)} ${t("cab_day")}`;
}
