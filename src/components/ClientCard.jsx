"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangContext";
import { GE_CITIES } from "@/data/data";
import { cityLabel, typeLabel } from "@/lib/dict";

const STAGES = ["new", "contact", "selection", "viewing", "negotiation", "deposit", "contract", "won", "lost"];
const TYPES = ["Квартира", "Студия", "Дом", "Коммерция", "Офис", "Участок", "Гараж"];

// Поле карточки. Объявлено ВНЕ компонента: компонент, созданный внутри рендера, пересоздавался
// бы при каждом обновлении состояния и сбрасывал бы ввод.
function F({ k, label, saved, children }) {
  return <label className="cl-field"><span>{label}{saved === k ? " ✓" : ""}</span>{children}</label>;
}

async function api(body) {
  const r = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
}

// Карточка клиента: контакты, источник, язык, требования, этап, следующее действие,
// заметки (ручные — автоматической истории звонков нет, и мы её не имитируем),
// связанные подборки и обращения, быстрые действия (только реальные: звонок, мессенджер, подборка).
export default function ClientCard({ client: initial, notes: notesInit, collections, leads, canReassign }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [notes, setNotes] = useState(notesInit || []);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");

  const fmt = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleString(lang === "ka" ? "ka-GE" : lang === "en" ? "en-GB" : "ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  const toLocalInput = (iso) => { if (!iso) return ""; const d = new Date(iso); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

  async function save(fields) {
    setBusy(true);
    const j = await api({ action: "update", id: c.id, ...fields });
    if (j.ok) { setC(j.item); setSaved(Object.keys(fields)[0]); setTimeout(() => setSaved(""), 1200); } else alert(t("cab_err"));
    setBusy(false);
  }
  async function addNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    const j = await api({ action: "note", id: c.id, body: note });
    if (j.ok) { setNotes((n) => [{ id: j.note.id, body: j.note.body, author: j.note.author, at: j.note.created_at }, ...n]); setNote(""); } else alert(t("cab_err"));
    setBusy(false);
  }
  async function remove() {
    if (!confirm(t("cl_delete_q"))) return;
    const j = await api({ action: "delete", id: c.id });
    if (j.ok) router.push("/my/clients"); else alert(t("cab_err"));
  }
  async function newCollection() {
    setBusy(true);
    const r = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", title: `${t("col_page_h")} — ${c.name}`, client_name: c.name, client_phone: c.phone || "", client_tg: c.tg || "", client_id: c.id }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) router.push(`/my/collections/${j.item.id}/pick`); else alert(t("cab_err"));
  }

  const inp = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14, background: "#fff" };
  const text = (k, extra = {}) => <input style={inp} defaultValue={c[k] || ""} onBlur={(e) => e.target.value !== (c[k] || "") && save({ [k]: e.target.value })} {...extra} />;

  return (
    <div>
      <div className="cabsh-head">
        <div>
          <Link href="/my/clients" className="cab-ed">← {t("cl_all")}</Link>
          <h1 style={{ marginTop: 6 }}>{c.name}</h1>
          <p>{[c.source && t("cl_src_" + c.source), c.lang && c.lang.toUpperCase(), canReassign && c.owner].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="cl-actions">
          {c.phone && <a className="btn btn-gold" href={`tel:+${c.phone}`}>📞 {t("cl_call")}</a>}
          {c.phone && <a className="btn btn-wa" href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener">💬 WhatsApp</a>}
          {c.tg && <a className="btn btn-tg" href={`https://t.me/${c.tg}`} target="_blank" rel="noopener">✈️ Telegram</a>}
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={newCollection}>🗂 {t("cl_new_collection")}</button>
        </div>
      </div>

      <div className="cl-stagebar">
        {STAGES.map((s) => (
          <button key={s} type="button" className={"cl-stagebtn st-" + s + (c.stage === s ? " on" : "")} disabled={busy} onClick={() => save({ stage: s })}>{t("cl_stage_" + s)}</button>
        ))}
      </div>

      <div className="cl-grid">
        <div className="cab-card">
          <div className="cab-h"><h2>{t("cl_contacts_h")}</h2></div>
          <F saved={saved} k="name" label={t("cl_f_name")}>{text("name")}</F>
          <F saved={saved} k="phone" label={t("cl_f_phone")}>{text("phone", { inputMode: "tel" })}</F>
          <F saved={saved} k="tg" label={t("cl_f_tg")}>{text("tg")}</F>
          <F saved={saved} k="email" label="Email">{text("email", { type: "email" })}</F>
          <F saved={saved} k="source" label={t("cl_f_source")}>
            <select style={inp} value={c.source || ""} onChange={(e) => save({ source: e.target.value })}><option value="">—</option>{["site", "telegram", "whatsapp", "call", "referral", "other"].map((s) => <option key={s} value={s}>{t("cl_src_" + s)}</option>)}</select>
          </F>
          <F saved={saved} k="lang" label={t("cl_f_lang")}>
            <select style={inp} value={c.lang || ""} onChange={(e) => save({ lang: e.target.value })}><option value="">—</option><option value="ru">Русский</option><option value="en">English</option><option value="ka">ქართული</option></select>
          </F>
          {canReassign && <F saved={saved} k="owner" label={t("cl_th_owner")}>{text("owner", { placeholder: "email или tg:123" })}</F>}
        </div>

        <div className="cab-card">
          <div className="cab-h"><h2>{t("cl_req_h")}</h2></div>
          <F saved={saved} k="req_deal" label={t("af_deal")}>
            <select style={inp} value={c.req_deal || ""} onChange={(e) => save({ req_deal: e.target.value })}><option value="">—</option><option value="sale">{t("deal_sale")}</option><option value="rent">{t("deal_rent")}</option><option value="daily">{t("deal_daily")}</option></select>
          </F>
          <F saved={saved} k="req_type" label={t("af_type")}>
            <select style={inp} value={c.req_type || ""} onChange={(e) => save({ req_type: e.target.value })}><option value="">—</option>{TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel(lang, ty)}</option>)}</select>
          </F>
          <F saved={saved} k="req_city" label={t("af_city")}>
            <select style={inp} value={c.req_city || ""} onChange={(e) => save({ req_city: e.target.value })}><option value="">—</option>{GE_CITIES.map((x) => <option key={x.name} value={x.name}>{cityLabel(lang, x.name)}</option>)}</select>
          </F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
            <F saved={saved} k="req_budget_min" label={t("f_priceFrom").replace(", $", "")}>{text("req_budget_min", { inputMode: "numeric" })}</F>
            <F saved={saved} k="req_budget_max" label={t("f_priceTo").replace(", $", "")}>{text("req_budget_max", { inputMode: "numeric" })}</F>
            <F saved={saved} k="req_currency" label="$/₾"><select style={inp} value={c.req_currency || "USD"} onChange={(e) => save({ req_currency: e.target.value })}><option>USD</option><option>GEL</option></select></F>
          </div>
          <F saved={saved} k="req_notes" label={t("cl_f_wishes")}><textarea style={inp} rows={3} defaultValue={c.req_notes || ""} onBlur={(e) => e.target.value !== (c.req_notes || "") && save({ req_notes: e.target.value })} /></F>
        </div>

        <div className="cab-card">
          <div className="cab-h"><h2>{t("cl_next_h")}</h2></div>
          <F saved={saved} k="next_action" label={t("cl_th_next")}>{text("next_action", { placeholder: t("cl_next_ph") })}</F>
          <F saved={saved} k="next_action_at" label={t("cl_th_date")}><input style={inp} type="datetime-local" defaultValue={toLocalInput(c.next_action_at)} onBlur={(e) => save({ next_action_at: e.target.value })} /></F>
          <div className="af-hint">{t("cl_next_hint")}</div>
        </div>

        <div className="cab-card">
          <div className="cab-h"><h2>{t("cl_colls_h")}</h2><button type="button" className="cab-ed" disabled={busy} onClick={newCollection}>＋ {t("col_new_h")}</button></div>
          {collections.length === 0 ? <p className="cab-empty">{t("cl_colls_empty")}</p> : collections.map((x) => (
            <div key={x.id} className="cl-row">
              <div><b>{x.title || t("col_untitled")}</b> · {t("col_n_items").replace("{n}", x.count)}{!x.enabled && <span className="cab-tag cab-tag-soft" style={{ marginLeft: 6 }}>{t("col_disabled")}</span>}</div>
              <div className="cl-sub">{x.items.map((i) => i.title).join(" · ")}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Link className="cab-ed" href={`/my/collections/${x.id}/pick`}>{t("col_pick")}</Link>
                <a className="cab-ed" href={`/c/${x.token}`} target="_blank" rel="noopener">{t("col_open")}</a>
              </div>
            </div>
          ))}
        </div>

        <div className="cab-card">
          <div className="cab-h"><h2>{t("cl_leads_h")}</h2></div>
          {leads.length === 0 ? <p className="cab-empty">{t("cl_leads_empty")}</p> : leads.map((l) => (
            <div key={l.id} className="cl-row">
              <div>{t("lead_t_" + (l.type_key || "other"))}{l.object_title ? <> · {l.slug ? <Link href={`/property/${l.slug}`} style={{ color: "var(--navy)" }}>{l.object_title}</Link> : l.object_title}</> : null} <span className={"cab-tag" + (l.status === "new" ? "" : " cab-tag-soft")}>{t("lead_s_" + (l.status || "new"))}</span></div>
              <div className="cl-sub">{fmt(l.created_at)}{l.comment ? ` · «${l.comment}»` : ""}</div>
            </div>
          ))}
        </div>

        <div className="cab-card cl-notes">
          <div className="cab-h"><h2>{t("cl_notes_h")}</h2></div>
          <form onSubmit={addNote} style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} placeholder={t("cl_note_ph")} value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn btn-gold" type="submit" disabled={busy || !note.trim()}>{t("cl_note_add")}</button>
          </form>
          <div className="af-hint" style={{ margin: "6px 0 10px" }}>{t("cl_notes_hint")}</div>
          {notes.length === 0 ? <p className="cab-empty">{t("cl_notes_empty")}</p> : notes.map((n) => (
            <div key={n.id} className="cl-row"><div style={{ whiteSpace: "pre-line" }}>{n.body}</div><div className="cl-sub">{fmt(n.at)}{n.author ? ` · ${n.author}` : ""}</div></div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <button type="button" className="btn btn-ghost" style={{ color: "#9a2b2b" }} onClick={remove}>{t("cl_delete")}</button>
      </div>
    </div>
  );
}
