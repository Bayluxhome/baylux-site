"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangContext";
import { writeActive, toActive, useActiveCollection } from "@/components/CollectionActive";
import { SITE_URL } from "@/config";

// Подборки для клиентов в кабинете (задача №07): создать, выбрать объекты (через панель),
// скопировать ссылку, подготовить отправку в WhatsApp/Telegram, выключить ссылку, удалить.
// Отправка — только подготовка текста и открытие мессенджера; «отправлено» не отмечаем.
async function api(body) {
  const r = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
}

export default function CollectionsList() {
  const { t } = useLang();
  const active = useActiveCollection();
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ title: "", client_name: "", client_phone: "", client_tg: "" });
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => { fetch("/api/collections").then((r) => r.json()).then((j) => setList(j.ok ? j.list : [])).catch(() => setList([])); }, []);

  const upd = (c) => setList((l) => l.map((x) => (x.id === c.id ? c : x)));
  const link = (c) => `${SITE_URL}/c/${c.token}`;
  const msg = (c) => (c.note || t("col_msg_default").replace("{name}", c.client_name || "").replace(/\s+/g, " ").trim()) + "\n" + link(c);

  async function create(e) {
    e.preventDefault();
    if (!form.title.trim() && !form.client_name.trim()) return;
    setBusy("create");
    const j = await api({ action: "create", ...form });
    if (j.ok) { setList((l) => [j.item, ...(l || [])]); setForm({ title: "", client_name: "", client_phone: "", client_tg: "" }); writeActive(toActive(j.item)); }
    else alert(t("cab_err"));
    setBusy("");
  }
  async function patch(c, fields) {
    setBusy(c.id);
    const j = await api({ action: "update", id: c.id, ...fields });
    if (j.ok) { upd(j.item); if (active?.id === c.id) writeActive(toActive(j.item)); } else alert(t("cab_err"));
    setBusy("");
  }
  async function remove(c) {
    if (!confirm(t("col_delete_q"))) return;
    setBusy(c.id);
    const j = await api({ action: "delete", id: c.id });
    if (j.ok) { setList((l) => l.filter((x) => x.id !== c.id)); if (active?.id === c.id) writeActive(null); } else alert(t("cab_err"));
    setBusy("");
  }
  async function copy(v, key) {
    try { await navigator.clipboard.writeText(v); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch { prompt(t("col_copy_manual"), v); }
  }
  // Ссылки на мессенджеры: при известном контакте клиента — прямо ему; иначе мессенджер
  // предложит выбрать получателя. Общий номер Baylux здесь не используется.
  const waHref = (c) => `https://wa.me/${c.client_phone || ""}?text=${encodeURIComponent(msg(c))}`;
  const tgHref = (c) => c.client_tg
    ? `https://t.me/${c.client_tg}?text=${encodeURIComponent(msg(c))}`
    : `https://t.me/share/url?url=${encodeURIComponent(link(c))}&text=${encodeURIComponent(msg(c).replace(link(c), "").trim())}`;

  const inp = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14 };

  return (
    <div id="collections">
      <form onSubmit={create} className="cab-card" style={{ marginBottom: 16 }}>
        <div className="cab-h"><h2>{t("col_new_h")}</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input style={inp} placeholder={t("col_f_title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input style={inp} placeholder={t("col_f_client")} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
          <input style={inp} placeholder={t("col_f_phone")} inputMode="tel" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
          <input style={inp} placeholder={t("col_f_tg")} value={form.client_tg} onChange={(e) => setForm({ ...form, client_tg: e.target.value })} />
        </div>
        <button className="btn btn-gold" type="submit" disabled={busy === "create"} style={{ marginTop: 12, padding: "10px 18px" }}>{t("col_create_btn")}</button>
        <div className="af-hint" style={{ marginTop: 8 }}>{t("col_create_hint")}</div>
      </form>

      {list === null ? <p className="cab-empty">…</p> : list.length === 0 ? <p className="cab-empty">{t("col_empty")}</p> : list.map((c) => {
        const isActive = active?.id === c.id;
        return (
          <div className="cab-card" key={c.id} style={{ marginBottom: 12, opacity: c.enabled ? 1 : 0.7 }}>
            <div className="cab-h" style={{ alignItems: "flex-start" }}>
              <div>
                <h2 style={{ margin: 0 }}>{c.title || t("col_untitled")}</h2>
                <div className="cab-ds">
                  {c.client_name || "—"}{c.client_phone ? ` · +${c.client_phone}` : ""}{c.client_tg ? ` · @${c.client_tg}` : ""}
                  {" · "}{t("col_n_items").replace("{n}", c.items.length)}
                  {!c.enabled && <span className="cab-tag cab-tag-soft" style={{ marginLeft: 8 }}>{t("col_disabled")}</span>}
                </div>
              </div>
              {isActive && <span className="cab-tag">{t("col_active")}</span>}
            </div>

            {c.items.length > 0 && (
              <div style={{ margin: "8px 0", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7 }}>
                {c.items.slice(0, 6).map((i) => <div key={i.id}>· <Link href={`/property/${i.slug}`} style={{ color: "var(--navy)" }}>{i.title}</Link></div>)}
                {c.items.length > 6 && <div>… +{c.items.length - 6}</div>}
              </div>
            )}

            <textarea rows={2} style={{ ...inp, marginTop: 8 }} placeholder={t("col_f_note")} defaultValue={c.note || ""} onBlur={(e) => e.target.value !== (c.note || "") && patch(c, { note: e.target.value })} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {isActive
                ? <button type="button" className="btn btn-ghost" onClick={() => writeActive(null)}>{t("col_stop_pick")}</button>
                : <Link className="btn btn-gold" href="/catalog" onClick={() => writeActive(toActive(c))}>{t("col_pick")}</Link>}
              <a className="btn btn-ghost" href={link(c)} target="_blank" rel="noopener">{t("col_open")}</a>
              <button type="button" className="btn btn-ghost" onClick={() => copy(link(c), "l" + c.id)}>{copied === "l" + c.id ? "✓" : t("col_copy_link")}</button>
              <button type="button" className="btn btn-ghost" onClick={() => copy(msg(c), "m" + c.id)}>{copied === "m" + c.id ? "✓" : t("col_copy_msg")}</button>
              <a className="btn btn-wa" href={waHref(c)} target="_blank" rel="noopener">💬 WhatsApp</a>
              <a className="btn btn-tg" href={tgHref(c)} target="_blank" rel="noopener">✈️ Telegram</a>
              <button type="button" className="btn btn-ghost" disabled={busy === c.id} onClick={() => patch(c, { enabled: !c.enabled })}>{c.enabled ? t("col_disable") : t("col_enable")}</button>
              <button type="button" className="btn btn-ghost" disabled={busy === c.id} onClick={() => remove(c)} style={{ color: "#9a2b2b" }}>{t("col_delete")}</button>
            </div>
            <div className="af-hint" style={{ marginTop: 6 }}>{t("col_send_hint")}</div>
          </div>
        );
      })}
    </div>
  );
}
