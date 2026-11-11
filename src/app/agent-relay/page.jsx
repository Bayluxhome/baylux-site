"use client";
// 11.11: служебная страница-ретранслятор для агента. WhatsApp Web не пускает запросы на наш домен (CSP),
// поэтому вкладка WhatsApp открывает эту страницу через window.open и передаёт голосовое через postMessage;
// страница (уже с нашей админ-сессией) загружает его в /api/agent-audio и возвращает ссылку обратно.
import { useEffect, useState } from "react";

const ORIGINS = ["https://web.whatsapp.com", "https://web.telegram.org"];

export default function AgentRelay() {
  const [state, setState] = useState("ready");
  useEffect(() => {
    const onMsg = async (e) => {
      if (!ORIGINS.includes(e.origin) || !e.data || !(e.data.blob instanceof Blob)) return;
      setState("uploading");
      let res;
      try {
        const fd = new FormData();
        fd.append("audio", e.data.blob, e.data.name || "voice.ogg");
        res = await fetch("/api/agent-audio", { method: "POST", body: fd }).then((r) => r.json());
      } catch (err) {
        res = { ok: false, error: String(err && err.message || err) };
      }
      setState(res && res.ok ? "done" : "error");
      try { e.source.postMessage({ agentAudio: res }, e.origin); } catch {}
    };
    window.addEventListener("message", onMsg);
    try { window.opener && ORIGINS.forEach((o) => window.opener.postMessage({ agentRelayReady: true }, o)); } catch {}
    return () => window.removeEventListener("message", onMsg);
  }, []);
  return <div style={{ padding: 24, fontFamily: "sans-serif" }} data-relay-state={state}>agent relay: {state}</div>;
}
