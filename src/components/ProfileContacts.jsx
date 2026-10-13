"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangContext";
import { normPhone, normTg, tgDisplay } from "@/lib/contacts";

// Профиль → «Контакты для объявлений» (13.10.2026). Телефон обязателен, Telegram — нет.
// Эти данные подставляются в каждое НОВОЕ объявление; старые объявления не меняются.
export default function ProfileContacts() {
  const { t } = useLang();
  const [phone, setPhone] = useState("");
  const [tg, setTg] = useState("");
  const [st, setSt] = useState("loading"); // loading | idle | saving | saved | error
  const [err, setErr] = useState({});

  useEffect(() => {
    fetch("/api/profile-contacts", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (j.ok) { setPhone(j.phone || ""); setTg(tgDisplay(j.tg)); }
      setSt("idle");
    }).catch(() => setSt("idle"));
  }, []);

  async function save(e) {
    e.preventDefault();
    const e2 = {};
    if (!normPhone(phone)) e2.phone = t("pc_err_phone");
    if (normTg(tg) === null) e2.tg = t("pc_err_tg");
    setErr(e2);
    if (Object.keys(e2).length) return;
    setSt("saving");
    try {
      const j = await fetch("/api/profile-contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, tg }) }).then((r) => r.json());
      if (!j.ok) { setErr(j.error === "phone" ? { phone: t("pc_err_phone") } : j.error === "tg" ? { tg: t("pc_err_tg") } : {}); setSt("error"); return; }
      setPhone(j.phone); setTg(tgDisplay(j.tg)); setSt("saved");
    } catch { setSt("error"); }
  }

  return (
    <form onSubmit={save} className="pc-box" noValidate>
      <h2 style={{ color: "var(--navy)", fontSize: 18, margin: "0 0 4px" }}>{t("pc_title")}</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "0 0 14px", lineHeight: 1.55 }}>{t("pc_intro")}</p>
      <div className="pc-grid">
        <label htmlFor="pc-phone">{t("pc_phone")} *
          <input id="pc-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+995 555 12 34 56" value={phone}
            disabled={st === "loading"} onChange={(e) => { setPhone(e.target.value); setSt("idle"); }}
            aria-invalid={!!err.phone} aria-describedby={err.phone ? "pc-phone-err" : undefined} />
          {err.phone && <span id="pc-phone-err" className="af-err">{err.phone}</span>}
        </label>
        <label htmlFor="pc-tg">{t("pc_tg")}
          <input id="pc-tg" type="text" autoComplete="off" placeholder="@username" value={tg}
            disabled={st === "loading"} onChange={(e) => { setTg(e.target.value); setSt("idle"); }}
            aria-invalid={!!err.tg} aria-describedby={err.tg ? "pc-tg-err" : undefined} />
          {err.tg && <span id="pc-tg-err" className="af-err">{err.tg}</span>}
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-gold" disabled={st === "saving" || st === "loading"} style={{ padding: "10px 18px" }}>
          {st === "saving" ? t("rp_saving") : t("rp_save")}
        </button>
        <span aria-live="polite" style={{ fontSize: 14, color: st === "error" ? "#b3261e" : "#1a7f37" }}>
          {st === "saved" ? t("pc_saved") : st === "error" && !err.phone && !err.tg ? t("rp_error") : ""}
        </span>
      </div>
    </form>
  );
}
