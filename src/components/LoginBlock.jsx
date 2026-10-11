"use client";
import { useState } from "react";
import Link from "next/link";
import BotLogin from "@/components/BotLogin";
import EmailLogin from "@/components/EmailLogin";
import { useLang } from "@/components/LangContext";

// Вход в кабинет (11.10.2026): основной способ — Google в один клик, второй — ссылка на почту.
// Вход через Telegram-бота убран из регистрации. Остался только свёрнутой ссылкой для тех,
// кто уже заходил через Telegram: их объявления привязаны к Telegram-аккаунту, и без этого
// они потеряли бы доступ к своему кабинету.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function LoginBlock() {
  const { t } = useLang();
  const [ok, setOk] = useState(false);
  const [mk, setMk] = useState(false);
  const [showTg, setShowTg] = useState(false);

  const googleHref = () => {
    const next = typeof window !== "undefined" ? window.location.pathname + window.location.search + window.location.hash : "/my";
    return `/api/google-login-init?m=${mk ? 1 : 0}&next=${encodeURIComponent(next)}`;
  };

  return (
    <div>
      <label className="consent-row">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>{t("consent_pre")}<Link href="/privacy">{t("consent_link")}</Link></span>
      </label>
      <label className="consent-row">
        <input type="checkbox" checked={mk} onChange={(e) => setMk(e.target.checked)} />
        <span>{t("consent_marketing")}</span>
      </label>

      <div style={{ opacity: ok ? 1 : 0.45, pointerEvents: ok ? "auto" : "none", marginTop: 14 }} aria-disabled={!ok}>
        <button type="button" className="btn btn-google" onClick={() => { window.location.href = googleHref(); }}>
          <GoogleIcon /> {t("gl_btn")}
        </button>
        <div style={{ margin: "18px 0 0", color: "var(--ink-soft)", fontSize: 13 }}>{t("el_or")}</div>
        <EmailLogin marketing={mk} />

        <div style={{ marginTop: 18, fontSize: 13 }}>
          {!showTg ? (
            <button type="button" onClick={() => setShowTg(true)} style={{ background: "none", border: 0, padding: 0, color: "var(--ink-soft)", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
              {t("gl_tg_old")}
            </button>
          ) : <BotLogin />}
        </div>
      </div>
      {!ok && <div className="af-hint" style={{ marginTop: 10 }}>{t("consent_required")}</div>}
    </div>
  );
}
