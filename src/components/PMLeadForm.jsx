"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

export default function PMLeadForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", phone: "", addr: "", type: "", comment: "", consent: false });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const TYPES = [["", "—"], ["studio", t("pm_t_studio")], ["r1", t("pm_t_1")], ["r2", t("pm_t_2")], ["r3", t("pm_t_3")]];

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.consent) return;
    setLoading(true);
    const typeLabel = (TYPES.find(([k]) => k === form.type) || [])[1] || "—";
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          type: "PROPERTY MANAGEMENT LEAD",
          object: form.addr || "—",
          comment: `Тип квартиры: ${typeLabel}` + (form.comment ? `\n${form.comment}` : ""),
        }),
      });
    } catch (_) {}
    setLoading(false);
    setSent(true);
  }

  const inp = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 15, fontFamily: "inherit", color: "var(--navy)", background: "#fff" };

  if (sent) {
    return (
      <div id="pm-form" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "34px 24px", textAlign: "center", scrollMarginTop: 80 }}>
        <div style={{ fontSize: 38, color: "var(--gold-dk)" }}>✓</div>
        <h3 style={{ color: "var(--navy)", margin: "8px 0 6px" }}>{t("pm_f_done_h")}</h3>
        <p style={{ color: "var(--ink-soft)", margin: 0 }}>{t("pm_f_done_p")}</p>
      </div>
    );
  }

  return (
    <form id="pm-form" onSubmit={submit} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "24px 22px", display: "grid", gap: 12, scrollMarginTop: 80 }}>
      <h2 style={{ color: "var(--navy)", margin: 0 }}>{t("pm_f_h")}</h2>
      <input style={inp} required placeholder={t("pm_f_name") + " *"} value={form.name} onChange={upd("name")} />
      <input style={inp} required type="tel" placeholder={t("pm_f_phone") + " * (+995 ...)"} value={form.phone} onChange={upd("phone")} />
      <input style={inp} placeholder={t("pm_f_addr")} value={form.addr} onChange={upd("addr")} />
      <select style={inp} value={form.type} onChange={upd("type")} aria-label={t("pm_f_type")}>
        {TYPES.map(([k, v]) => <option key={k} value={k}>{k ? v : t("pm_f_type")}</option>)}
      </select>
      <textarea style={{ ...inp, resize: "vertical" }} rows={3} placeholder={t("pm_f_comment")} value={form.comment} onChange={upd("comment")} />
      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: "var(--ink-soft)", cursor: "pointer" }}>
        <input type="checkbox" required checked={form.consent} onChange={upd("consent")} style={{ marginTop: 2 }} />
        {t("pm_f_consent")}
      </label>
      <button className="btn btn-gold" type="submit" disabled={loading}>{loading ? "…" : t("pm_f_btn")}</button>
    </form>
  );
}
