"use client";
import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangContext";

const NEXT = { new: "in_work", in_work: "done" };

function timeAgo(iso, t) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} ${t("cab_min")}`;
  if (m < 1440) return `${Math.round(m / 60)} ${t("cab_hour")}`;
  return `${Math.round(m / 1440)} ${t("cab_day")}`;
}

// Список обращений (раздел «Заявки» кабинета): фильтр по статусу, ссылка на объект,
// смена статуса. Право на смену проверяет сервер (/api/lead-status).
export default function LeadsList({ leads: initial, compact = false }) {
  const { t } = useLang();
  const [leads, setLeads] = useState(initial || []);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState("open");

  async function setStatus(id, status) {
    setBusy(id);
    try {
      const r = await fetch("/api/lead-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const j = await r.json();
      if (j.ok) setLeads((l) => l.map((x) => (x.id === id ? { ...x, status } : x))); else alert(t("cab_err"));
    } catch { alert(t("cab_err")); }
    setBusy(null);
  }

  const shown = leads.filter((l) => filter === "all" ? true : filter === "open" ? l.status !== "done" : l.status === filter);
  const list = compact ? shown.slice(0, 8) : shown;

  return (
    <div className="cab-card">
      <div className="cab-h">
        <h2>{t("cab_leads_h")}</h2>
        {!compact && (
          <div className="cab-tabs" style={{ margin: 0 }}>
            {[["open", "lead_f_open"], ["new", "lead_s_new"], ["in_work", "lead_s_in_work"], ["done", "lead_s_done"], ["all", "lead_f_all"]].map(([k, lk]) => (
              <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{t(lk)}</button>
            ))}
          </div>
        )}
        {compact && <Link className="cab-ed" href="/my/leads">{t("cl_all")} →</Link>}
      </div>
      {list.length ? list.map((l) => (
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
            {l.realtor_notify_status && l.realtor_notify_status !== "skipped_no_realtor" && (
              <div className="cab-ds" style={{ color: l.realtor_notify_status === "sent" ? "var(--ink-soft)" : "#9a2b2b" }}>
                {l.realtor_notify_status === "sent" ? "✈️ " : "⚠️ "}{t("lead_rn_" + l.realtor_notify_status)}
              </div>
            )}
          </div>
          <div className="cab-rt">
            <div className="cab-tm">{timeAgo(l.created_at, t)}</div>
            <span className={"cab-tag" + (l.status === "new" ? "" : " cab-tag-soft")}>{t("lead_s_" + (l.status || "new"))}</span>
            {NEXT[l.status || "new"] && (
              <button type="button" className="cab-ed" disabled={busy === l.id} onClick={() => setStatus(l.id, NEXT[l.status || "new"])} style={{ marginTop: 4 }}>
                {t("lead_next_" + NEXT[l.status || "new"])}
              </button>
            )}
          </div>
        </div>
      )) : <p className="cab-empty">{t("cab_leads_empty")}</p>}
    </div>
  );
}
