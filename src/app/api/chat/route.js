// Чат-подборщик недвижимости (T-20261118-02, прототип).
//
// POST { conversationId, messages: [{role:"user"|"assistant", content:"..."}], lang? }
//   → { ok, reply, conversationId }
// Claude API напрямую (без SDK): https://api.anthropic.com/v1/messages, модель claude-haiku-5-5.
// Ключ только из process.env.ANTHROPIC_API_KEY (вносится в Vercel). Нет ключа → ответ-заглушка.
// Модель видит только публичную выдачу через инструменты (lib/chat/tools.js), без контактов собственников.
import { randomBytes } from "crypto";
import { SYSTEM_PROMPT, TOOLS } from "@/lib/chat/prompt";
import { runTool, subscriptionsAvailable } from "@/lib/chat/tools";
import { LIMITS, checkRate, ipOf, logTurn, isTestRequest } from "@/lib/chat/guard";
import { fixMixedScript } from "@/lib/chat/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Грузинский текст занимает в 3-4 раза больше токенов: при общем потолке 600 первый ответ
// со списком вариантов обрезался (сбой «ვერ მოხერხდა პასუხი» в тесте 18.11 02:26). Потолок по языку.
const MAX_TOKENS = { ka: 1600, ru: 900, en: 800 };
const CALL_TIMEOUT_MS = 25000;

const MODEL = "claude-haiku-5-5";
const API = "https://api.anthropic.com/v1/messages";

const STUB = {
  ru: "Чат скоро заработает. Пока можно оставить заявку через кнопку «Связаться» или написать нам в WhatsApp.",
  en: "The chat will be available soon. Meanwhile, please leave a request via the Contact button or message us on WhatsApp.",
  ka: "ჩატი მალე ამუშავდება. მანამდე დაგვიტოვეთ განაცხადი ღილაკით „დაკავშირება“ ან მოგვწერეთ WhatsApp-ში.",
};
const BUSY = {
  ru: "Сейчас много сообщений. Попробуйте чуть позже или оставьте заявку, менеджер свяжется с вами.",
  en: "Too many messages right now. Please try again a bit later or leave a request and a manager will contact you.",
  ka: "ახლა ძალიან ბევრი შეტყობინებაა. სცადეთ მოგვიანებით ან დაგვიტოვეთ განაცხადი.",
};
const ERR = {
  ru: "Не получилось ответить. Попробуйте ещё раз или оставьте заявку.",
  en: "Something went wrong. Please try again or leave a request.",
  ka: "ვერ მოხერხდა პასუხი. სცადეთ ხელახლა ან დაგვიტოვეთ განაცხადი.",
};

// Без длинных и средних тире в ответах (требование задачи) — страховка поверх промта.
const noDash = (s) => String(s || "").replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",");

function guessLang(text, hint) {
  if (/[Ⴀ-ჿᲐ-Ჿ]/.test(text)) return "ka";
  if (/[а-яё]/i.test(text)) return "ru";
  if (/[a-z]/i.test(text)) return "en";
  return ["ru", "en", "ka"].includes(hint) ? hint : "ru";
}

// История от клиента: только роли user/assistant, только текст, обрезка по длине и количеству.
function cleanHistory(arr) {
  const msgs = (Array.isArray(arr) ? arr : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, LIMITS.MAX_MSG_CHARS) }))
    .slice(-LIMITS.HISTORY);
  while (msgs.length && msgs[0].role !== "user") msgs.shift(); // API требует начинать с user
  // склеиваем подряд идущие сообщения одной роли
  const out = [];
  for (const m of msgs) {
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += "\n" + m.content;
    else out.push({ ...m });
  }
  return out;
}

// Один вызов Claude с таймаутом; при перегрузке/сетевой ошибке/таймауте один повтор через 1,5 с.
async function callClaude(key, { messages, tools, maxTokens, noTools }) {
  const body = { model: MODEL, max_tokens: maxTokens, system: SYSTEM_PROMPT, tools, messages };
  if (noTools) body.tool_choice = { type: "none" }; // последний раунд: только текст, без новых вызовов
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (r.ok) return await r.json();
      const t = await r.text().catch(() => "");
      lastErr = new Error(`anthropic ${r.status}: ${t.slice(0, 200)}`);
      if (![408, 409, 429, 500, 502, 503, 504, 529].includes(r.status)) throw lastErr;
    } catch (e) {
      lastErr = e?.name === "AbortError" ? new Error("anthropic timeout") : e;
      if (String(lastErr?.message || "").match(/anthropic (4(0[0-7]|1\d|2[0-8]))/)) throw lastErr;
    } finally {
      clearTimeout(timer);
    }
    if (attempt === 0) await new Promise((res) => setTimeout(res, 1500));
  }
  throw lastErr;
}

export async function POST(req) {
  let lang = "ru", conversationId = "", userText = "", ip = "unknown", test = false;
  const t0 = Date.now();
  try {
    test = isTestRequest(req);
    if (!/application\/json/i.test(req.headers.get("content-type") || "")) return Response.json({ ok: false, error: "bad_type" }, { status: 415 });
    const body = await req.json().catch(() => ({}));
    conversationId = /^[A-Za-z0-9_-]{8,64}$/.test(String(body.conversationId || "")) ? String(body.conversationId) : randomBytes(9).toString("base64url");
    const history = cleanHistory(body.messages);
    const last = history[history.length - 1];
    if (!last || last.role !== "user") return Response.json({ ok: false, error: "empty" }, { status: 400 });
    userText = last.content;
    lang = guessLang(userText, body.lang);
    ip = ipOf(req);

    const turns = history.filter((m) => m.role === "user").length;
    const rate = test ? true : checkRate(ip, conversationId, turns); // тестовый режим без лимитов
    if (rate !== true) return Response.json({ ok: true, reply: BUSY[lang], conversationId, limited: rate });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return Response.json({ ok: true, reply: STUB[lang], conversationId, stub: true });

    const ctx = { shownIds: new Set(), allowAnyPublished: true, leadCreated: false, lang, subscribeUrl: null, test };
    // Нет таблицы chat_subscriptions → инструмента подписки у модели нет, подписку не предлагает.
    const tools = (await subscriptionsAvailable()) ? TOOLS : TOOLS.filter((t) => t.name !== "telegram_subscribe");
    const maxTokens = MAX_TOKENS[lang] || 900;
    const usedTools = [];
    let messages = history;
    let reply = "", stop = "";
    for (let round = 0; round <= LIMITS.TOOL_ROUNDS; round++) {
      const res = await callClaude(key, { messages, tools, maxTokens, noTools: round === LIMITS.TOOL_ROUNDS });
      stop = res.stop_reason || "";
      const blocks = Array.isArray(res.content) ? res.content : [];
      const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      const calls = blocks.filter((b) => b.type === "tool_use");
      if (res.stop_reason !== "tool_use" || !calls.length || round === LIMITS.TOOL_ROUNDS) { reply = text; break; }
      const results = [];
      for (const c of calls) {
        usedTools.push(c.name);
        const out = await runTool(c.name, c.input, ctx);
        results.push({ type: "tool_result", tool_use_id: c.id, content: JSON.stringify(out).slice(0, 8000) });
      }
      messages = [...messages, { role: "assistant", content: blocks }, { role: "user", content: results }];
    }
    const empty = !reply;
    reply = fixMixedScript(noDash(reply)) || ERR[lang];
    const ms = Date.now() - t0;
    logTurn({ conversationId, ip, lang, userText, reply, tools: usedTools, test, ms, error: empty ? `empty reply (stop=${stop})` : null });
    return Response.json({
      ok: true, reply, conversationId, lead: ctx.leadCreated || undefined, subscribe: ctx.subscribeUrl || undefined,
      ...(test ? { test: true, debug: { ms, tools: usedTools, stop, lang, testLead: ctx.testLead || null } } : {}),
    });
  } catch (e) {
    console.error("chat:", e?.message);
    const ms = Date.now() - t0;
    logTurn({ conversationId, ip, lang, userText, reply: "", tools: [], error: e?.message, test, ms });
    return Response.json({ ok: true, reply: ERR[lang], conversationId, error: "failed", ...(test ? { test: true, debug: { ms, error: String(e?.message || "").slice(0, 300) } } : {}) });
  }
}
