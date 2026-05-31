"use client";
import { useState } from "react";
import Link from "next/link";
import BotLogin from "@/components/BotLogin";
import TelegramLogin from "@/components/TelegramLogin";
import EmailLogin from "@/components/EmailLogin";
import { useLang } from "@/components/LangContext";

export default function LoginBlock() {
  const { t } = useLang();
  const [ok, setOk] = useState(false);
  const [mk, setMk] = useState(false);

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
        <BotLogin />
        <div style={{ margin: "22px 0 0", color: "var(--ink-soft)", fontSize: 13 }}>{t("cab_or")}</div>
        <TelegramLogin />
        <div style={{ margin: "22px 0 0", color: "var(--ink-soft)", fontSize: 13 }}>{t("el_or")}</div>
        <EmailLogin marketing={mk} />
      </div>
      {!ok && <div className="af-hint" style={{ marginTop: 10 }}>{t("consent_required")}</div>}
    </div>
  );
}
