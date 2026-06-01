"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

export default function RealtorPanel({ initial }) {
  const { t } = useLang();
  const [open, setOpen] = useState(!!initial);
  const [f, setF] = useState({ name: initial?.name || "", phone: initial?.phone || "", deal_types: initial?.deal_types || "", bio: initial?.bio || "" });
  const [state, setState] = useState("");
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setState("loading");
    try {
      const r = await fetch("/api/realtor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json();
      setState(j.ok ? "done" : "error");
    } catch { setState("error"); }
  }
  async function remove() {
    if (!confirm(t("rp_off_confirm"))) return;
    setState("loading");
    try { await fetch("/api/realtor", { method: "DELETE" }); window.location.reload(); } catch { setState("error"); }
  }

  return (
    <div style={{ marginTop: 30, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
      <h2 style={{ color: "var(--navy)", fontSize: 18, marginBottom: 6 }}>{t("rp_title")}</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 14, lineHeight: 1.6, maxWidth: 640 }}>{t("rp_intro")}</p>

      {!open ? (
        <button type="button" className="btn btn-gold" onClick={() => setOpen(true)} style={{ padding: "10px 18px" }}>{t("rp_become")}</button>
      ) : (
        <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <input placeholder={t("rp_name")} value={f.name} onChange={(e) => upd("name", e.target.value)} className="ri-inp" />
          <input placeholder={t("rp_phone")} value={f.phone} onChange={(e) => upd("phone", e.target.value)} className="ri-inp" />
          <input placeholder={t("rp_deal")} value={f.deal_types} onChange={(e) => upd("deal_types", e.target.value)} className="ri-inp" />
          <textarea placeholder={t("rp_bio")} value={f.bio} onChange={(e) => upd("bio", e.target.value)} rows={3} className="ri-inp" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-gold" onClick={save} disabled={state === "loading"} style={{ padding: "10px 18px" }}>
              {state === "loading" ? t("rp_saving") : initial ? t("rp_save") : t("rp_publish")}
            </button>
            {initial && <button type="button" className="btn btn-ghost" onClick={remove} style={{ padding: "10px 18px", color: "#b3261e", borderColor: "#e7b4af" }}>{t("rp_off")}</button>}
          </div>
          {state === "done" && <div style={{ color: "#1a7f37", fontSize: 14 }}>{t("rp_done")} <a href="/realtors" style={{ color: "var(--gold-dk)", fontWeight: 600 }}>{t("rp_view")}</a></div>}
          {state === "error" && <div style={{ color: "#b3261e", fontSize: 13 }}>{t("rp_error")}</div>}
        </div>
      )}
    </div>
  );
}
