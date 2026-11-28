"use client";
// Список заявок в админке (T-20261128-02): фильтры, статус, ответственный, комментарий.
// Все тексты — через словарь (RU/EN/KA). Сохранение — /api/admin/leads (право проверяет сервер).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangContext";

const TZ = "Asia/Tbilisi";
const LOCALE = { ru: "ru-RU", en: "en-GB", ka: "ka-GE" };
const NEXT = { new: "in_work", in_work: "done" };
const STATUS_COLOR = { new: ["#FDF4DE", "#96690c"], in_work: ["#EAF1FB", "#1F5C99"], done: ["#eef2f7", "#4a5b70"] };

export default function AdminLeads({ leads: initial, sqlReady = true }) {
  const { t, lang } = useLang();
  const [leads, setLeads] = useState(initial || []);
  const [fs, setFs] = useState("open");
  const [fw, setFw] = useState("any");
  const [fo, setFo] = useState("any");
  const [fk, setFk] = useState("any");
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState({});       // id → "saved" | "err" | "sql"
  const [notes, setNotes] = useState({});   // id → несохранённый текст комментария
  const [needSql, setNeedSql] = useState(!sqlReady);

  const fmt = (iso) => { try { return new Date(iso).toLocaleString(LOCALE[lang] || "ru-RU", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

  async function save(id, body, local) {
    setBusy(id);
    let res = "err";
    try {
      const r = await fetch("/api/admin/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) { res = "saved"; setLeads((ls) => ls.map((x) => (x.id === id ? { ...x, ...local } : x))); }
      else if (j.error === "sql_needed") { res = "sql"; setNeedSql(true); }
    } catch { /* res = err */ }
    setMsg((m) => ({ ...m, [id]: res }));
    setBusy(null);
    return res === "saved";
  }

  const shown = useMemo(() => leads.filter((l) =>
    (fs === "all" ? true : fs === "open" ? l.status !== "done" : l.status === fs) &&
    (fw === "any" ? true : fw === "none" ? !l.manager : l.manager === fw) &&
    (fo === "any" ? true : l.origin === fo) &&
    (fk === "any" ? true : l.kind === fk)
  ), [leads, fs, fw, fo, fk]);

  const cnt = (fn) => leads.filter(fn).length;
  const sel = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontSize: 14, color: "var(--navy)", fontFamily: "inherit" };
  const lab = { fontSize: 12, color: "var(--ink-soft)", fontWeight: 600, display: "grid", gap: 4 };
  const waDigits = (p) => String(p || "").replace(/\D/g, "");

  return (
    <div>
      {needSql && <div style={{ background: "#FDF4DE", border: "1px solid #E6D3A8", color: "#7a560a", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 14 }}>⚠️ {t("al_sql")}</div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
        <label style={lab}>{t("al_f_status")}
          <select style={sel} value={fs} onChange={(e) => setFs(e.target.value)}>
            <option value="open">{t("lead_f_open")} · {cnt((l) => l.status !== "done")}</option>
            <option value="new">{t("lead_s_new")} · {cnt((l) => l.status === "new")}</option>
            <option value="in_work">{t("lead_s_in_work")} · {cnt((l) => l.status === "in_work")}</option>
            <option value="done">{t("lead_s_done")} · {cnt((l) => l.status === "done")}</option>
            <option value="all">{t("al_any")} · {leads.length}</option>
          </select>
        </label>
        <label style={lab}>{t("al_f_who")}
          <select style={sel} value={fw} onChange={(e) => setFw(e.target.value)}>
            <option value="any">{t("al_any")}</option>
            <option value="none">{t("al_who_none")}</option>
            <option value="dmitry">{t("al_who_dmitry")}</option>
            <option value="tatiana">{t("al_who_tatiana")}</option>
          </select>
        </label>
        <label style={lab}>{t("al_f_src")}
          <select style={sel} value={fo} onChange={(e) => setFo(e.target.value)}>
            <option value="any">{t("al_any")}</option>
            <option value="site">{t("al_src_site")} · {cnt((l) => l.origin === "site")}</option>
            <option value="chat">{t("al_src_chat")} · {cnt((l) => l.origin === "chat")}</option>
            <option value="test">{t("al_src_test")} · {cnt((l) => l.origin === "test")}</option>
          </select>
        </label>
        <label style={lab}>{t("al_f_kind")}
          <select style={sel} value={fk} onChange={(e) => setFk(e.target.value)}>
            <option value="any">{t("al_any")}</option>
            {["rent", "sale", "daily", "other"].map((k) => <option key={k} value={k}>{t("lk_" + k)} · {cnt((l) => l.kind === k)}</option>)}
          </select>
        </label>
        <span style={{ color: "var(--ink-soft)", fontSize: 13, paddingBottom: 9 }}>{t("al_total")} {leads.length} · {t("al_shown")} {shown.length}</span>
      </div>

      {shown.length === 0 ? <p style={{ color: "var(--ink-soft)" }}>{t("al_empty")}</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {shown.map((l) => {
            const [bg, fg] = STATUS_COLOR[l.status] || STATUS_COLOR.new;
            const noteVal = notes[l.id] !== undefined ? notes[l.id] : l.note;
            const dirty = notes[l.id] !== undefined && notes[l.id] !== l.note;
            const typeLabel = t("lead_t_" + l.type_key);
            return (
              <div key={l.id} style={{ background: "#fff", border: "1px solid var(--line)", borderLeft: `5px solid ${fg}`, borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8, opacity: l.status === "done" ? 0.75 : 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ background: bg, color: fg, fontWeight: 700, fontSize: 12, padding: "3px 10px", borderRadius: 999 }}>{t("lead_s_" + l.status)}</span>
                  <b style={{ color: "var(--navy)" }}>{l.name || t("cab_noname")}</b>
                  {l.phone && <a href={`tel:${l.phone}`} style={{ color: "var(--navy)", fontWeight: 600 }}>📞 {l.phone}</a>}
                  {waDigits(l.phone).length >= 9 && l.origin !== "test" && <a href={`https://wa.me/${waDigits(l.phone)}`} target="_blank" rel="noopener noreferrer" style={{ color: "#1a7f37", fontWeight: 600, fontSize: 13 }}>WhatsApp</a>}
                  <span style={{ marginLeft: "auto", color: "var(--ink-soft)", fontSize: 13, whiteSpace: "nowrap" }}>{fmt(l.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-soft)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span className="cab-tag cab-tag-soft" style={{ margin: 0 }}>{t("lk_" + l.kind)}</span>
                  <span>{typeLabel}</span>
                  <span className="cab-tag cab-tag-soft" style={{ margin: 0 }}>{t("al_src_" + l.origin)}{l.source && l.origin === "site" ? ` · ${l.source}` : ""}</span>
                  <span style={{ color: l.delivered ? "var(--ink-soft)" : "#9a2b2b" }}>{l.delivered ? "✈️ " + t("al_delivered") : "⚠️ " + t("al_not_delivered")}</span>
                </div>
                {l.object_title && (
                  <div style={{ fontSize: 14 }}>🏠 {l.slug ? <Link href={`/property/${l.slug}`} target="_blank" style={{ color: "var(--navy)", fontWeight: 600 }}>{l.object_title}</Link> : l.object_title}</div>
                )}
                {l.comment && <div style={{ fontSize: 14, fontStyle: "italic", color: "var(--ink)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>«{l.comment}»</div>}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start", borderTop: "1px dashed var(--line)", paddingTop: 8 }}>
                  <label style={lab}>{t("al_f_who")}
                    <select style={sel} value={l.manager} disabled={busy === l.id} onChange={(e) => save(l.id, { manager: e.target.value }, { manager: e.target.value })}>
                      <option value="">{t("al_who_none")}</option>
                      <option value="dmitry">{t("al_who_dmitry")}</option>
                      <option value="tatiana">{t("al_who_tatiana")}</option>
                    </select>
                  </label>
                  <label style={{ ...lab, flex: 1, minWidth: 220 }}>{t("al_note")}
                    <textarea rows={2} style={{ ...sel, width: "100%", resize: "vertical" }} maxLength={2000} placeholder={t("al_note_ph")} value={noteVal}
                      onChange={(e) => setNotes((n) => ({ ...n, [l.id]: e.target.value }))} />
                  </label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", paddingTop: 18 }}>
                    {dirty && <button type="button" className="btn btn-gold" disabled={busy === l.id} style={{ padding: "7px 12px", fontSize: 13 }}
                      onClick={async () => { if (await save(l.id, { note: noteVal }, { note: noteVal.trim() })) setNotes((n) => { const c = { ...n }; delete c[l.id]; return c; }); }}>{t("al_save")}</button>}
                    {NEXT[l.status] && <button type="button" className="btn btn-navy" disabled={busy === l.id} style={{ padding: "7px 12px", fontSize: 13 }}
                      onClick={() => save(l.id, { status: NEXT[l.status] }, { status: NEXT[l.status] })}>{t("lead_next_" + NEXT[l.status])}</button>}
                    {l.status !== "new" && <button type="button" className="btn btn-ghost" disabled={busy === l.id} style={{ padding: "7px 12px", fontSize: 13 }}
                      onClick={() => save(l.id, { status: "new" }, { status: "new" })}>{t("al_reopen")}</button>}
                  </div>
                </div>
                {(msg[l.id] || l.handled_by) && (
                  <div style={{ fontSize: 12, color: msg[l.id] === "err" || msg[l.id] === "sql" ? "#9a2b2b" : "var(--ink-soft)" }}>
                    {msg[l.id] === "saved" ? "✓ " + t("al_saved") : msg[l.id] === "err" ? t("al_err") : msg[l.id] === "sql" ? t("al_sql") : `${t("al_handled")}: ${l.handled_by}${l.handled_at ? ", " + fmt(l.handled_at) : ""}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
