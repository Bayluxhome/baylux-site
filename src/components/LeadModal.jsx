"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/components/LangContext";

// Форма заявки. «Отправлено» показываем ТОЛЬКО когда сервер подтвердил запись в базе.
// Сбой сети/сервера → понятная ошибка и кнопка «Повторить»; введённое не теряется.
export default function LeadModal() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState({ type: "", object: "", title: "" });
  const [state, setState] = useState("form"); // form | sending | sent | error
  const [form, setForm] = useState({ name: "", phone: "", comment: "" });

  useEffect(() => {
    const h = (e) => {
      setCtx(e.detail || {});
      setState("form");
      setForm({ name: "", phone: "", comment: "" });
      setOpen(true);
    };
    window.addEventListener("baylux:lead", h);
    return () => window.removeEventListener("baylux:lead", h);
  }, []);

  if (!open) return null;

  async function submit(e) {
    if (e) e.preventDefault();
    if (!form.phone.trim() || state === "sending") return;
    setState("sending");
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: ctx.type, typeKey: ctx.typeKey || "other", object: ctx.object, listingId: ctx.listingId || "", source: ctx.source || "", collectionToken: ctx.collectionToken || "" }),
      });
      const j = await r.json().catch(() => ({}));
      setState(j.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="lead-overlay" onClick={() => setOpen(false)}>
      <div className="lead-box" onClick={(e) => e.stopPropagation()}>
        <button className="lead-close" onClick={() => setOpen(false)} aria-label={t("lead_close")}>✕</button>
        {state === "sent" ? (
          <div className="lead-done">
            <div className="lead-check">✓</div>
            <h3>{t("lead_sent_h")}</h3>
            <p>{t("lead_sent_p")}</p>
            <button className="btn btn-gold" onClick={() => setOpen(false)}>{t("lead_close")}</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3>{ctx.title || t("lead_default_h")}</h3>
            {ctx.object ? <p className="lead-obj">📍 {ctx.object}</p> : null}
            <input required placeholder={t("lead_ph_name")} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required placeholder={t("lead_ph_phone")} inputMode="tel" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <textarea placeholder={t("lead_ph_comment")} rows={3} value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            {state === "error" && (
              <p className="lead-note" style={{ color: "#9a2b2b", fontWeight: 600 }}>{t("lead_err")}</p>
            )}
            <button className="btn btn-gold" type="submit" disabled={state === "sending"}>
              {state === "sending" ? t("lead_sending") : state === "error" ? t("lead_retry") : t("lead_submit")}
            </button>
            <p className="lead-note">{t("lead_consent")}</p>
          </form>
        )}
      </div>
    </div>
  );
}
