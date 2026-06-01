"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

export default function RealtorPanel({ initial }) {
  const { t } = useLang();
  const [open, setOpen] = useState(!!initial);
  const [f, setF] = useState({ name: initial?.name || "", phone: initial?.phone || "", deal_types: initial?.deal_types || "", bio: initial?.bio || "" });
  const [photo, setPhoto] = useState(initial?.photo || "");
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState("");
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file, "realtor.jpg");
      const r = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const j = await r.json();
      if (j.ok) setPhoto(j.url);
    } catch { /* ignore */ }
    setUploading(false);
  }

  async function save() {
    setState("loading");
    try {
      const r = await fetch("/api/realtor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, photo }) });
      const j = await r.json();
      setState(j.ok ? "done" : "error");
    } catch { setState("error"); }
  }
  async function remove() {
    if (!confirm(t("rp_off_confirm"))) return;
    setState("loading");
    try { await fetch("/api/realtor", { method: "DELETE" }); window.location.reload(); } catch { setState("error"); }
  }

  const statusBadge = initial && (
    <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: initial.status === "approved" ? "#e6f4ea" : initial.status === "rejected" ? "#fce8e6" : "#fff3e0",
      color: initial.status === "approved" ? "#1a7f37" : initial.status === "rejected" ? "#b3261e" : "#b3801e" }}>
      {initial.status === "approved" ? t("rp_st_ok") : initial.status === "rejected" ? t("rp_st_no") : t("rp_st_wait")}
    </span>
  );

  return (
    <div style={{ marginTop: 30, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h2 style={{ color: "var(--navy)", fontSize: 18, margin: 0 }}>{t("rp_title")}</h2>
        {statusBadge}
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 14, lineHeight: 1.6, maxWidth: 640 }}>{t("rp_intro")}</p>

      {!open ? (
        <button type="button" className="btn btn-gold" onClick={() => setOpen(true)} style={{ padding: "10px 18px" }}>{t("rp_become")}</button>
      ) : (
        <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="realtor-ava" style={{ margin: 0, width: 64, height: 64 }}>
              {photo ? <img src={photo} alt="" /> : <span>{(f.name || "B").slice(0, 1).toUpperCase()}</span>}
            </div>
            <label className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
              {uploading ? t("rp_photo_up") : t("rp_photo")}
              <input type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
            </label>
          </div>
          <input placeholder={t("rp_name")} value={f.name} onChange={(e) => upd("name", e.target.value)} className="ri-inp" />
          <input placeholder={t("rp_phone")} value={f.phone} onChange={(e) => upd("phone", e.target.value)} className="ri-inp" />
          <input placeholder={t("rp_deal")} value={f.deal_types} onChange={(e) => upd("deal_types", e.target.value)} className="ri-inp" />
          <textarea placeholder={t("rp_bio")} value={f.bio} onChange={(e) => upd("bio", e.target.value)} rows={3} className="ri-inp" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-gold" onClick={save} disabled={state === "loading" || uploading} style={{ padding: "10px 18px" }}>
              {state === "loading" ? t("rp_saving") : initial ? t("rp_save") : t("rp_publish")}
            </button>
            {initial && <button type="button" className="btn btn-ghost" onClick={remove} style={{ padding: "10px 18px", color: "#b3261e", borderColor: "#e7b4af" }}>{t("rp_off")}</button>}
          </div>
          {state === "done" && <div style={{ color: "#1a7f37", fontSize: 14 }}>{t("rp_sent")}</div>}
          {state === "error" && <div style={{ color: "#b3261e", fontSize: 13 }}>{t("rp_error")}</div>}
        </div>
      )}
    </div>
  );
}
