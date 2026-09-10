"use client";
import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangContext";

// Дашборд кабинета: метрики, объекты с истекающей актуальностью, обращения и график.
// Данные реальные: просмотры — из listing_views, обращения — из leads (sql/017).
export default function CabinetDashboard({ stats, stale: staleInit, leads, series, objects = [] }) {
  const { t } = useLang();
  const [stale, setStale] = useState(staleInit || []);
  const [busy, setBusy] = useState(null);
  const [tab, setTab] = useState("views");
  const [leadList, setLeadList] = useState(leads || []);
  const [leadBusy, setLeadBusy] = useState(null);

  // Статус заявки: new → in_work → done. Право проверяет сервер (/api/lead-status).
  async function setLeadStatus(id, status) {
    setLeadBusy(id);
    try {
      const r = await fetch("/api/lead-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const j = await r.json();
      if (j.ok) setLeadList((l) => l.map((x) => (x.id === id ? { ...x, status } : x)));
      else alert(t("cab_err"));
    } catch { alert(t("cab_err")); }
    setLeadBusy(null);
  }
  const NEXT = { new: "in_work", in_work: "done" };

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
          {/* «Требуют обновления»: если пусто — явное состояние «всё актуально», а не отсутствие блока */}
          {stale.length === 0 && (
            <div className="cab-card">
              <div className="cab-h"><h2>{t("cab_stale_h")}</h2></div>
              <p className="cab-empty">{stats.active > 0 ? t("cab_stale_ok") : t("cab_objects_empty")}</p>
            </div>
          )}
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

          {/* «Мои объекты» — первые шесть с фото, характеристиками, статусом; остальное — в разделе */}
          <div className="cab-card">
            <div className="cab-h"><h2>{t("cab_nav_objects")}</h2><Link className="cab-ed" href="/my/objects">{t("cab_all_objects")} →</Link></div>
            {objects.length === 0 ? (
              <div className="cab-empty-box">
                <p className="cab-empty">{t("cab_objects_empty")}</p>
                <p className="cab-sub">{t("cab_objects_empty_p")}</p>
                <Link className="btn btn-gold" href="/add">＋ {t("cab_nav_add")}</Link>
              </div>
            ) : objects.slice(0, 6).map((o) => (
              <div className="cab-upd" key={o.id}>
                <img className="cab-ph" src={o.photo} alt="" />
                <div className="cab-in">
                  <div className="cab-nm">{o.title}</div>
                  <div className="cab-ds">{o.sub}</div>
                  <span className={"cab-tag" + (o.status === "approved" ? " cab-tag-soft" : "")}>{t("my_" + (o.status || "pending"))}</span>
                </div>
                <div className="cab-acts">
                  {o.slug && <Link className="cab-ed" href={`/property/${o.slug}`}>{t("my_view")}</Link>}
                  <Link className="cab-ed" href={`/my/edit/${o.id}`}>{t("cab_edit")}</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="cab-card">
            <div className="cab-h"><h2>{t("cab_leads_h")}</h2><Link className="cab-ed" href="/my/leads">{t("cl_all_leads")} →</Link></div>
            {leadList.length ? leadList.slice(0, 8).map((l) => (
              <div className="cab-lead" key={l.id} style={l.status === "done" ? { opacity: 0.55 } : undefined}>
                <div className="cab-av">{(l.name || "?").slice(0, 1).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="cab-nm">{l.name || t("cab_noname")}</div>
                  <div className="cab-ds">
                    {t("lead_t_" + (l.type_key || "other"))}
                    {l.object_title ? <> · {l.listing_slug ? <Link href={`/property/${l.listing_slug}`} style={{ color: "var(--navy)", fontWeight: 600 }}>{l.object_title}</Link> : l.object_title}</> : null}
                  </div>
                  {l.phone && <a className="cab-tel" href={`tel:${l.phone}`}>📞 {l.phone}</a>}
                  {l.comment && <div className="cab-ds" style={{ marginTop: 2, fontStyle: "italic" }}>«{l.comment}»</div>}
                  {l.notify_error && !l.notified_at && <div className="cab-ds" style={{ color: "#9a2b2b" }}>⚠️ {t("lead_not_notified")}</div>}
                </div>
                <div className="cab-rt">
                  <div className="cab-tm">{timeAgo(l.created_at, t)}</div>
                  <span className={"cab-tag" + (l.status === "new" ? "" : " cab-tag-soft")}>{t("lead_s_" + (l.status || "new"))}</span>
                  {NEXT[l.status || "new"] && (
                    <button type="button" className="cab-ed" disabled={leadBusy === l.id} onClick={() => setLeadStatus(l.id, NEXT[l.status || "new"])} style={{ marginTop: 4 }}>
                      {t("lead_next_" + NEXT[l.status || "new"])}
                    </button>
                  )}
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
