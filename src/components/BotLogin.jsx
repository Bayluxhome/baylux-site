"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangContext";

// Вход через Telegram-бота: сайт выдаёт одноразовый токен → человек жмёт «Start» в боте →
// бот отмечает токен → сайт (опрос) получает сессию.
// 12.10.2026: на телефонах вход часто «не срабатывал»:
//  1) окно бота открывалось ПОСЛЕ запроса к серверу — браузер считал это всплывающим окном и
//     блокировал (iOS Safari). Теперь вкладка открывается сразу по нажатию, адрес подставляется следом;
//  2) пока человек в Telegram, браузер замораживает опрос — по возвращении на сайт проверяем сразу.
export default function BotLogin({ primary = false }) {
  const { t } = useLang();
  const [waiting, setWaiting] = useState(false);
  const [botUrl, setBotUrl] = useState("");
  const timer = useRef(null);
  const tokenRef = useRef("");

  async function check() {
    if (!tokenRef.current) return;
    try {
      const j = await fetch("/api/tg-login-poll?token=" + tokenRef.current, { cache: "no-store" }).then((r) => r.json());
      if (j.ok) { stop(); window.location.reload(); }
      else if (j.expired) { stop(); setWaiting(false); }
    } catch { /* сеть — проверим в следующий раз */ }
  }
  function stop() { clearInterval(timer.current); timer.current = null; }

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); stop(); };
  }, []);

  async function start() {
    const win = window.open("about:blank", "_blank"); // сразу, в рамках нажатия — не блокируется
    try {
      const r = await fetch("/api/tg-login-init", { cache: "no-store" });
      const { token, url } = await r.json();
      if (!token) { if (win) win.close(); return; }
      tokenRef.current = token;
      setBotUrl(url);
      if (win && !win.closed) win.location.href = url;
      else window.location.href = url; // окно не открылось (жёсткая блокировка) — уходим в бота в этой вкладке
      setWaiting(true);
      stop();
      let tries = 0;
      timer.current = setInterval(() => { tries++; if (tries > 240) { stop(); setWaiting(false); return; } check(); }, 2500);
    } catch (e) { if (win) win.close(); setWaiting(false); }
  }

  return (
    <div>
      <button type="button" className={primary ? "btn btn-gold" : "btn btn-tg-login"} onClick={start} style={{ padding: "12px 20px", fontSize: 15 }}>
        ✈️ {t("bl_btn")}
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
