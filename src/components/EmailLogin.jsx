"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

export default function EmailLogin() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState("");
  const [st, setSt] = useState(""); // "", sending, sent, error

  async function submit(e) {
    e.preventDefault();
    setSt("sending");
    try {
      const r = await fetch("/api/email-login-init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, lang }) });
      const j = await r.json();
      setSt(j.ok ? "sent" : "error");
    } catch {
      setSt("error");
    }
  }

  if (st === "sent") return <div className="af-hint" style={{ color: "var(--navy)", fontSize: 14, marginTop: 10 }}>✅ {t("el_sent")}</div>;

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("el_ph")}
        style={{ flex: 1, minWidth: 200, border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px", fontFamily: "inherit", fontSize: 15 }} />
      <button className="btn btn-gold" type="submit" disabled={st === "sending"} style={{ padding: "11px 20px" }}>
        {st === "sending" ? t("el_sending") : t("el_btn")}
      </button>
      {st === "error" && <div className="af-err" style={{ flexBasis: "100%" }}>{t("el_err")}</div>}
    </form>
  );
}
