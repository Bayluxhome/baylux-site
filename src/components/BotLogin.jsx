"use client";
import { useRef, useState } from "react";
import { useLang } from "@/components/LangContext";

export default function BotLogin() {
  const { t } = useLang();
  const [waiting, setWaiting] = useState(false);
  const [botUrl, setBotUrl] = useState("");
  const timer = useRef(null);

  async function start() {
    try {
      const r = await fetch("/api/tg-login-init");
      const { token, url } = await r.json();
      if (!token) return;
      setBotUrl(url);
      window.open(url, "_blank");
      setWaiting(true);
      let tries = 0;
      timer.current = setInterval(async () => {
        tries++;
        if (tries > 120) { clearInterval(timer.current); setWaiting(false); return; }
        const p = await fetch("/api/tg-login-poll?token=" + token);
        const j = await p.json();
        if (j.ok) { clearInterval(timer.current); window.location.reload(); }
        else if (j.expired) { clearInterval(timer.current); setWaiting(false); }
      }, 2500);
    } catch (e) { setWaiting(false); }
  }

  return (
    <div>
      <button className="btn btn-gold" onClick={start} style={{ padding: "13px 24px", fontSize: 15 }}>
        {t("bl_btn")}
      </button>
      {waiting && (
        <p style={{ marginTop: 12, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.5 }}>
          {t("bl_wait")}
          {botUrl && (
            <>
              {" "}
              <a href={botUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-dk)", fontWeight: 600 }}>
                {t("bl_open")}
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
