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
// Общий бюджет времени ответа (maxDuration 60 с): не начинаем вызов/повтор, если до него не успеть.
// Тест Мозга 18.11 04:05: при 20 параллельных запросах ответы шли 15–32 с, один упал в «Не получилось ответить».
const DEADLINE_MS = 52000;

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

// Системный промт с пометкой кэша (prompt caching): инструменты + промт кэшируются на 5 минут —
// быстрее и меньше входных токенов в минуту, реже упираемся в лимит API при параллельных диалогах.
const SYSTEM = [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }];

// Один вызов Claude с таймаутом; при перегрузке/сетевой ошибке/таймауте до двух повторов (1,5 с и 3 с,
// или сколько просит retry-after, не больше 6 с), пока укладываемся в общий срок deadline.
async function callClaude(key, { messages, tools, maxTokens, noTools, deadline }) {
  const body = { model: MODEL, max_tokens: maxTokens, system: SYSTEM, tools, messages };
  if (noTools) body.tool_choice = { type: "none" }; // последний раунд: только текст, без новых вызовов
  let lastErr, wait = 1500;
  for (let attempt = 0; attempt < 3; attempt++) {
    const left = deadline - Date.now();
    if (left < 4000) { lastErr = lastErr || new Error("deadline"); break; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(CALL_TIMEOUT_MS, left - 1000));
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
      const ra = parseFloat(r.headers.get("retry-after") || "");
      if (ra > 0) wait = Math.min(6000, ra * 1000);
    } catch (e) {
      lastErr = e?.name === "AbortError" ? new Error("anthropic timeout") : e;
      if (String(lastErr?.message || "").match(/anthropic (4(0[0-7]|1\d|2[0-8]))/)) throw lastErr;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < 2 && deadline - Date.now() > wait + 5000) { await new Promise((res) => setTimeout(res, wait)); wait = Math.min(6000, wait * 2); }
    else break;
  }
  throw lastErr;
}

// Запасной ответ без модели: если поиск уже выполнен, а Claude не ответил (перегрузка, таймаут, пустой ответ),
// показываем найденное сами, а не «Не получилось ответить».
const FB = {
  ru: { found: (n) => `Нашла вариантов: ${n}. Вот первые:`, near: "Точно под запрос сейчас нет, вот ближайшие варианты:", all: "Смотреть все", ask: "Уточните, пожалуйста, бюджет, район или число комнат, чтобы я сузила подбор." },
  en: { found: (n) => `I found ${n} options. Here are the first ones:`, near: "Nothing matches exactly right now, here are the closest options:", all: "See all", ask: "Could you tell me your budget, area or number of rooms so I can narrow it down?" },
  ka: { found: (n) => `ვიპოვე ${n} ვარიანტი. აი პირველები:`, near: "ზუსტად ასეთი ახლა არ არის, აი უახლოესი ვარიანტები:", all: "ყველას ნახვა", ask: "მითხარით ბიუჯეტი, უბანი ან ოთახების რაოდენობა, რომ შევარჩიო ზუსტად." },
};
function fallbackReply(found, lang) {
  const out = found && found.out;
  if (!out || !Array.isArray(out.items) || !out.items.length) return "";
  const f = FB[lang] || FB.ru;
  const lines = [out.widened ? f.near : f.found(out.total)];
  out.items.slice(0, 5).forEach((c, i) => {
    const txt = found.name === "search_new_buildings"
      ? [c.name, c.district, c.facts].filter(Boolean).join(", ")
      : [c.title, c.price, c.address].filter(Boolean).join(", ");
    lines.push(`${i + 1}. ${txt}: ${c.url}`);
  });
  if (out.catalog_url && out.total > out.items.length) lines.push(`${f.all}: ${out.catalog_url}`);
  lines.push(f.ask);
  return lines.join("\n");
}
// Аргументы вызовов для журнала (без create_lead: там контакт клиента).
const callLog = (name, input) => name === "create_lead" ? name : `${name} ${JSON.stringify(input || {}).slice(0, 220)}`;

export async function POST(req) {
  let lang = "ru", conversationId = "", userText = "", ip = "unknown", test = false;
  const t0 = Date.now();
  const deadline = t0 + DEADLINE_MS;
  const usedTools = [], calls = [];
  let lastFound = null, ctxRef = null;
  const withFlags = (list) => [...list, ...(ctxRef?.flags || [])];
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

    // userText — для правила «N+1» в поиске; flags — сбои каталога/инструментов для журнала (fix8).
    const ctx = { shownIds: new Set(), allowAnyPublished: true, leadCreated: false, lang, subscribeUrl: null, test, userText, flags: [] };
    ctxRef = ctx;
    // Нет таблицы chat_subscriptions → инструмента подписки у модели нет, подписку не предлагает.
    const tools = (await subscriptionsAvailable()) ? TOOLS : TOOLS.filter((t) => t.name !== "telegram_subscribe");
    const maxTokens = MAX_TOKENS[lang] || 900;
    let messages = history;
    let reply = "", stop = "";
    for (let round = 0; round <= LIMITS.TOOL_ROUNDS; round++) {
      // мало времени до потолка — последний раунд сразу без инструментов
      const noTools = round === LIMITS.TOOL_ROUNDS || (round > 0 && deadline - Date.now() < 15000);
      const res = await callClaude(key, { messages, tools, maxTokens, noTools, deadline });
      stop = res.stop_reason || "";
      const blocks = Array.isArray(res.content) ? res.content : [];
      const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      const uses = blocks.filter((b) => b.type === "tool_use");
      if (res.stop_reason !== "tool_use" || !uses.length || noTools) { reply = text; break; }
      const results = [];
      for (const c of uses) {
        usedTools.push(c.name);
        calls.push(callLog(c.name, c.input));
        const out = await runTool(c.name, c.input, ctx);
        if ((c.name === "search_listings" || c.name === "search_new_buildings") && out && Array.isArray(out.items) && out.items.length) lastFound = { name: c.name, out };
        results.push({ type: "tool_result", tool_use_id: c.id, content: JSON.stringify(out).slice(0, 8000) });
      }
      messages = [...messages, { role: "assistant", content: blocks }, { role: "user", content: results }];
    }
    const empty = !reply;
    const fb = empty ? fallbackReply(lastFound, lang) : "";
    reply = fixMixedScript(noDash(reply || fb)) || ERR[lang];
    const ms = Date.now() - t0;
    // await: на Vercel незавершённая запись после ответа теряется (в тесте 04:05 в журнале 12 из 20 диалогов)
    await logTurn({ conversationId, ip, lang, userText, reply, tools: withFlags(calls.length ? calls : usedTools), test, ms, error: empty ? `empty reply (stop=${stop})${fb ? " fallback" : ""}` : null });
    return Response.json({
      ok: true, reply, conversationId, lead: ctx.leadCreated || undefined, subscribe: ctx.subscribeUrl || undefined,
      ...(test ? { test: true, debug: { ms, tools: usedTools, calls, flags: ctx.flags, stop, lang, testLead: ctx.testLead || null, fallback: !!fb } } : {}),
    });
  } catch (e) {
    console.error("chat:", e?.message);
    const ms = Date.now() - t0;
    // Поиск уже был — отдаём найденное без модели, а не «Не получилось ответить».
    const fb = fixMixedScript(noDash(fallbackReply(lastFound, lang)));
    await logTurn({ conversationId, ip, lang, userText, reply: fb, tools: withFlags(calls.length ? calls : usedTools), error: (fb ? "fallback: " : "") + (e?.message || "error"), test, ms });
    return Response.json({ ok: true, reply: fb || ERR[lang], conversationId, ...(fb ? { fallback: true } : { error: "failed" }), ...(test ? { test: true, debug: { ms, calls, error: String(e?.message || "").slice(0, 300) } } : {}) });
  }
}
