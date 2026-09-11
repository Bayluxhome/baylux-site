"use client";
// Форма обратной связи на странице «Контакты» (задача: контакты и реквизиты).
// Пишет в ту же таблицу leads через /api/lead (typeKey contact_form) — отдельной базы обращений нет,
// заявка попадает в чат менеджеров и в кабинет /my/leads. Honeypot-поле `website` — для ботов.
import { useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangContext";

const PHONE_RE = /^\+?\d{9,15}$/;

export default function ContactForm() {
  const { t, lang } = useLang();
  const [f, setF] = useState({ name: "", phone: "", msg: "", consent: false, website: "" });
  const [err, setErr] = useState({});
  const [state, setState] = useState("idle"); // idle | sending | ok | fail
  const okRef = useRef(null);
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  function validate() {
    const e = {};
    if (f.name.trim().length < 2) e.name = t("cf_e_name");
    if (!PHONE_RE.test(f.phone.replace(/[\s()\-]/g, ""))) e.phone = t("cf_e_phone");
    if (f.msg.trim().length < 5) e.msg = t("cf_e_msg");
    if (!f.consent) e.consent = t("cf_e_consent");
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErr(e);
    if (Object.keys(e).length) return;
    setState("sending");
    let ok = false;
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          phone: f.phone.trim(),
          comment: f.msg.trim(),
          type: `Форма «Контакты» · ${lang}`,
          typeKey: "contact_form",
          source: "contact_form",
          website: f.website, // honeypot
        }),
      });
      ok = !!(await r.json().catch(() => ({}))).ok;
    } catch (_) {}
    setState(ok ? "ok" : "fail");
    if (ok) setTimeout(() => okRef.current?.focus(), 0);
  }

  if (state === "ok") {
    return (
      <div ref={okRef} tabIndex={-1} role="status" className="cf-box cf-ok">
        <div style={{ fontSize: 34, color: "var(--gold-dk)" }}>✓</div>
        <p style={{ margin: "6px 0 0" }}>{t("cf_ok")}</p>
      </div>
    );
  }

  const field = (key, label, el) => (
    <div className="cf-field">
      <label htmlFor={"cf-" + key}>{label} *</label>
      {el}
      {err[key] && <div id={"cf-" + key + "-err"} className="cf-err" role="alert">{err[key]}</div>}
    </div>
  );

  return (
    <form className="cf-box" onSubmit={submit} noValidate>
      <h2 style={{ margin: "0 0 4px" }}>{t("cf_h")}</h2>
      {field("name", t("cf_name"), (
        <input id="cf-name" className="cf-inp" value={f.name} onChange={upd("name")} autoComplete="name" maxLength={200}
          aria-invalid={!!err.name} aria-describedby={err.name ? "cf-name-err" : undefined} />
      ))}
      {field("phone", t("cf_phone"), (
        <input id="cf-phone" className="cf-inp" type="tel" inputMode="tel" value={f.phone} onChange={upd("phone")} autoComplete="tel" placeholder="+995 5XX XX XX XX" maxLength={30}
          aria-invalid={!!err.phone} aria-describedby={err.phone ? "cf-phone-err" : undefined} />
      ))}
      {field("msg", t("cf_msg"), (
        <textarea id="cf-msg" className="cf-inp" rows={4} value={f.msg} onChange={upd("msg")} maxLength={1000}
          aria-invalid={!!err.msg} aria-describedby={err.msg ? "cf-msg-err" : undefined} />
      ))}
      {/* honeypot: скрыт от людей, боты заполняют */}
      <div style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
        <input tabIndex={-1} autoComplete="off" value={f.website} onChange={upd("website")} name="website" />
      </div>
      <label className="cf-consent">
        <input type="checkbox" checked={f.consent} onChange={upd("consent")} aria-invalid={!!err.consent} aria-describedby={err.consent ? "cf-consent-err" : undefined} />
        <span>{t("cf_consent")} <Link href="/privacy" target="_blank">{t("cf_consent_link")}</Link>.</span>
      </label>
      {err.consent && <div id="cf-consent-err" className="cf-err" role="alert">{err.consent}</div>}
      {state === "fail" && <div className="cf-err" role="alert">{t("cf_err")}</div>}
      <button className="btn btn-gold" type="submit" disabled={state === "sending"} aria-busy={state === "sending"}>
        {state === "sending" ? t("cf_sending") : t("cf_btn")}
      </button>
    </form>
  );
}
