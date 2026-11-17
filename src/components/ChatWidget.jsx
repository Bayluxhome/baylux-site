"use client";
// Чат-подборщик (T-20261118-02, прототип): маленькая кнопка в углу, без автооткрытия.
// Показывается только при CHAT_WIDGET=on (переменная окружения, передаётся из layout пропсом)
// или для теста по ссылке с ?chat=1 (запоминается до закрытия вкладки).
// История диалога и conversationId хранятся в localStorage (bxChatHist, 7 дней): диалог продолжается
// после закрытия окна чата, перехода по страницам и перезагрузки. Кнопка «Новый диалог» очищает.
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangContext";

const TXT = {
  ru: { open: "Подобрать жильё", title: "Hanna · Baylux", hello: "Здравствуйте! Я Hanna, помогу подобрать квартиру из объявлений Baylux. Какой город и что ищете: аренду, посуточно или покупку?", ph: "Напишите сообщение…", send: "Отправить", close: "Закрыть", wait: "Печатает…", sub: "Получать подборки в Telegram", subNote: "Нажимая, вы соглашаетесь получать подборки от Baylux в Telegram. Отписаться — /stop", fresh: "Новый диалог" },
  en: { open: "Find a home", title: "Hanna · Baylux", hello: "Hi! I'm Hanna. I can help you find a property from Baylux listings. Which city, and are you looking to rent, book daily or buy?", ph: "Type a message…", send: "Send", close: "Close", wait: "Typing…", sub: "Get selections in Telegram", subNote: "By tapping, you agree to receive selections from Baylux in Telegram. Unsubscribe — /stop", fresh: "New chat" },
  ka: { open: "ბინის შერჩევა", title: "ჰანა · Baylux", hello: "გამარჯობა! მე ვარ ჰანა, დაგეხმარებით ბინის შერჩევაში Baylux-ის განცხადებებიდან. რომელი ქალაქი და რას ეძებთ: ქირა, დღიური თუ ყიდვა?", ph: "დაწერეთ შეტყობინება…", send: "გაგზავნა", close: "დახურვა", wait: "იწერება…", sub: "შერჩევების მიღება Telegram-ში", subNote: "დაჭერით თანხმდებით, მიიღოთ Baylux-ის შერჩევები Telegram-ში. გამოწერის გაუქმება — /stop", fresh: "ახალი დიალოგი" },
};

const HIST_KEY = "bxChatHist";
const HIST_TTL = 7 * 24 * 3600 * 1000; // 7 дней с последнего сообщения
const SUB_RE = /^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=s_[A-Za-z0-9_-]+$/;

function loadHist() {
  try {
    const j = JSON.parse(localStorage.getItem(HIST_KEY) || "null");
    if (!j || !Array.isArray(j.msgs) || !j.ts || Date.now() - j.ts > HIST_TTL) { localStorage.removeItem(HIST_KEY); return null; }
    const msgs = j.msgs
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000), ...(typeof m.sub === "string" && SUB_RE.test(m.sub) ? { sub: m.sub } : {}) }))
      .slice(-60);
    return { id: /^[A-Za-z0-9_-]{8,64}$/.test(String(j.id || "")) ? String(j.id) : "", msgs };
  } catch { return null; }
}
function saveHist(id, msgs) {
  try {
    if (!msgs.length) { localStorage.removeItem(HIST_KEY); return; }
    localStorage.setItem(HIST_KEY, JSON.stringify({ v: 1, id: id || "", ts: Date.now(), msgs: msgs.slice(-60) }));
  } catch { /* нет localStorage или переполнен — чат работает без сохранения */ }
}

// Модель иногда присылает Markdown: убираем **жирный**, __жирный__, *курсив*, `код`, решётки заголовков.
function stripMd(s) {
  return String(s)
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/(^|[\s(«"])\*([^*\n]+)\*(?=[\s.,;:!?)»"]|$)/g, "$1$2")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/, "");
}

// Ссылки в ответе делаем кликабельными; остальной текст — как текст (без HTML из ответа).
function Linkify({ text }) {
  const parts = String(text).split(/(https?:\/\/[^\s)]+)/g);
  return parts.map((p, i) => /^https?:\/\//.test(p)
    ? <a key={i} href={p.replace(/[.,;:!?]+$/, "")} target="_blank" rel="noopener" style={{ color: "var(--navy)", textDecoration: "underline", wordBreak: "break-all" }}>{decodeSafe(p.replace(/[.,;:!?]+$/, "").replace(/^https?:\/\/(www\.)?bayluxhome\.com/, ""))}</a>
    : <span key={i}>{p}</span>);
}
function decodeSafe(s) { try { return decodeURI(s); } catch { return s; } }

// Ответ помощницы: без Markdown; строки списка («- », «* », «• ») показываем отдельными строками с точкой.
function Reply({ text }) {
  const lines = String(text).split(/\r?\n/);
  return lines.map((raw, i) => {
    const m = raw.match(/^\s*(?:[-*•]|–|—)\s+(.*)$/);
    const body = stripMd(m ? m[1] : raw);
    if (!body.trim()) return <div key={i} style={{ height: 6 }} />;
    return (
      <div key={i} style={m ? { display: "flex", gap: 6, marginTop: 2 } : undefined}>
        {m && <span aria-hidden="true">•</span>}
        <span style={{ minWidth: 0 }}><Linkify text={body} /></span>
      </div>
    );
  });
}

export default function ChatWidget({ enabled = false }) {
  const ctx = useLang() || {};
  const lang = ["ru", "en", "ka"].includes(ctx.lang) ? ctx.lang : "ru";
  const t = TXT[lang];
  const [show, setShow] = useState(enabled);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const conv = useRef("");
  const endRef = useRef(null);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("chat");
      if (q === "1") sessionStorage.setItem("bxChat", "1");
      if (q === "1" || sessionStorage.getItem("bxChat") === "1") setShow(true);
    } catch { /* без sessionStorage — только по флагу */ }
    // Продолжаем прошлый диалог (если он не старше 7 дней); окно открыто, если было открыто в этой вкладке.
    const h = loadHist();
    if (h) { conv.current = h.id; setMsgs(h.msgs); }
    try { if (sessionStorage.getItem("bxChatOpen") === "1") setOpen(true); } catch { /* нет sessionStorage */ }
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) saveHist(conv.current, msgs); }, [msgs]);
  useEffect(() => { if (!loaded.current) return; try { sessionStorage.setItem("bxChatOpen", open ? "1" : "0"); } catch { /* нет sessionStorage */ } }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, busy, open]);

  if (!show) return null;

  function fresh() {
    if (busy) return;
    conv.current = "";
    setMsgs([]); setInput("");
    try { localStorage.removeItem(HIST_KEY); } catch { /* нет localStorage */ }
  }

  async function send(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: conv.current || undefined, messages: next.slice(-20).map((m) => ({ role: m.role, content: m.content })), lang }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.conversationId) conv.current = j.conversationId;
      // subscribe — deep link на бота (кнопка подписки на подборки), только если сервер её выдал.
      const sub = typeof j.subscribe === "string" && SUB_RE.test(j.subscribe) ? j.subscribe : null;
      setMsgs([...next, { role: "assistant", content: j.reply || "…", sub }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "…" }]);
    } finally { setBusy(false); }
  }

  const box = { position: "fixed", right: 16, bottom: 16, zIndex: 1500, fontFamily: "Inter, system-ui, sans-serif" };
  if (!open) {
    return (
      <div style={box}>
        <button type="button" onClick={() => setOpen(true)} aria-label={t.open}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--navy)", color: "#fff", border: "1.5px solid var(--gold)", borderRadius: 999, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: "var(--shadow-lg)" }}>
          <span aria-hidden="true" style={{ color: "var(--gold)" }}>●</span>{t.open}
        </button>
      </div>
    );
  }
  return (
    <div style={{ ...box, width: "min(360px, calc(100vw - 32px))", height: "min(520px, calc(100vh - 100px))", display: "flex", flexDirection: "column", background: "#fff", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--navy)", color: "#fff", padding: "12px 14px", borderBottom: "2px solid var(--gold)" }}>
        <b style={{ fontSize: 15 }}>{t.title}</b>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {msgs.length > 0 && (
            <button type="button" onClick={fresh} disabled={busy} style={{ background: "none", border: "1px solid var(--gold)", borderRadius: 8, color: "#fff", fontSize: 12, padding: "4px 8px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>{t.fresh}</button>
          )}
          <button type="button" onClick={() => setOpen(false)} aria-label={t.close} style={{ background: "none", border: 0, color: "#fff", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12, background: "var(--cream)", display: "flex", flexDirection: "column", gap: 8 }}>
        {[{ role: "assistant", content: t.hello }, ...msgs].map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.45, padding: "8px 11px", borderRadius: 12,
            background: m.role === "user" ? "var(--navy)" : "#fff", color: m.role === "user" ? "#fff" : "var(--ink)", border: m.role === "user" ? 0 : "1px solid var(--line)" }}>
            {m.role === "user" ? m.content : <Reply text={m.content} />}
            {m.sub && (
              <div style={{ marginTop: 8 }}>
                <a href={m.sub} target="_blank" rel="noopener" style={{ display: "inline-block", background: "var(--navy)", color: "#fff", border: "1.5px solid var(--gold)", borderRadius: 10, padding: "8px 12px", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>✈️ {t.sub}</a>
                <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.35, color: "var(--ink-soft)" }}>{t.subNote}</div>
              </div>
            )}
          </div>
        ))}
        {busy && <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{t.wait}</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: 6, padding: 10, borderTop: "1px solid var(--line)" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder={t.ph}
          style={{ flex: 1, minWidth: 0, border: "1px solid var(--line)", borderRadius: 10, padding: "9px 10px", fontSize: 14, fontFamily: "inherit" }} />
        <button type="submit" disabled={busy || !input.trim()} className="btn-gold" style={{ borderRadius: 10, padding: "9px 14px", border: 0, cursor: "pointer" }}>{t.send}</button>
      </form>
    </div>
  );
}
