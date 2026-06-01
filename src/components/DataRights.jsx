"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

export default function DataRights() {
  const { t } = useLang();
  const [confirm, setConfirm] = useState(false);
  const [state, setState] = useState("");

  async function download() {
    try {
      const r = await fetch("/api/my-data");
      if (!r.ok) { setState("error"); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "baylux-my-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { setState("error"); }
  }

  async function remove() {
    setState("loading");
    try {
      const r = await fetch("/api/delete-account", { method: "POST" });
      const j = await r.json();
      if (j.ok) { window.location.href = "/"; return; }
      setState("error");
    } catch { setState("error"); }
  }

  return (
    <div style={{ marginTop: 36, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
      <h2 style={{ color: "var(--navy)", fontSize: 18, marginBottom: 6 }}>{t("dr_title")}</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 16, lineHeight: 1.6, maxWidth: 640 }}>{t("dr_intro")}</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={download} style={{ padding: "10px 18px" }}>{t("dr_download")}</button>
        {!confirm ? (
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(true)}
            style={{ padding: "10px 18px", color: "#b3261e", borderColor: "#e7b4af" }}>{t("dr_delete")}</button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, color: "#b3261e" }}>{t("dr_confirm")}</span>
            <button type="button" className="btn" onClick={remove} disabled={state === "loading"}
              style={{ padding: "9px 16px", background: "#b3261e", color: "#fff" }}>
              {state === "loading" ? t("dr_deleting") : t("dr_delete_yes")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setConfirm(false); setState(""); }}
              style={{ padding: "9px 16px" }}>{t("dr_cancel")}</button>
          </div>
        )}
      </div>
      {state === "error" && <div style={{ color: "#b3261e", fontSize: 13, marginTop: 10 }}>{t("dr_error")}</div>}
    </div>
  );
}
