// Чат-подборщик (T-20261118-02): лимиты и журнал диалогов.
//
// Лимиты — в памяти серверного инстанса (как простой первый рубеж: на Vercel у каждого
// инстанса своя память, поэтому это не жёсткая гарантия, а защита от очевидного спама).
// Жёсткий потолок расходов дополнительно держат: max_tokens на ответ, MAX_TURNS на диалог,
// обрезка истории и длины сообщений.
//
// Журнал: таблица chat_logs (sql/033_chat_logs.sql). Телефоны, e-mail и @ники маскируются
// ДО записи; IP хранится только как короткий хэш. Нет таблицы — журнал молча пропускается.
import { createHash } from "crypto";
import { supa } from "@/lib/supabase";

export const LIMITS = {
  IP_PER_10MIN: 30,     // сообщений с одного IP за 10 минут
  IP_PER_DAY: 150,      // сообщений с одного IP за сутки
  MAX_TURNS: 30,        // сообщений клиента в одном диалоге
  MAX_MSG_CHARS: 1000,  // длина одного сообщения клиента
  HISTORY: 20,          // сколько последних сообщений уходит в модель
  MAX_TOKENS: 600,      // потолок ответа модели
  TOOL_ROUNDS: 4,       // сколько раз модель может вызвать инструменты за один ответ
};

const hits = new Map(); // ip -> [timestamps]
const convTurns = new Map(); // conversationId -> число сообщений

export function ipOf(req) {
  const xf = req.headers.get("x-forwarded-for") || "";
  return (xf.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}
export const ipHash = (ip) => createHash("sha256").update(String(ip) + (process.env.CHAT_SALT || "baylux-chat")).digest("hex").slice(0, 16);

// true — можно; иначе код причины.
export function checkRate(ip, conversationId, turnsFromClient) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 864e5);
  if (arr.filter((t) => now - t < 10 * 60e3).length >= LIMITS.IP_PER_10MIN) return "rate_ip";
  if (arr.length >= LIMITS.IP_PER_DAY) return "rate_ip_day";
  const turns = Math.max(convTurns.get(conversationId) || 0, turnsFromClient || 0);
  if (turns >= LIMITS.MAX_TURNS) return "rate_conv";
  arr.push(now);
  hits.set(ip, arr);
  convTurns.set(conversationId, turns + 1);
  // уборка, чтобы карты не росли бесконечно
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 864e5)) hits.delete(k);
  if (convTurns.size > 20000) convTurns.clear();
  return true;
}

// Маскировка персональных данных для журнала.
export function maskPII(s) {
  return String(s || "")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone]")
    .replace(/(^|\s)@[A-Za-z0-9_]{4,32}/g, "$1[tg]")
    .slice(0, 2000);
}

// Тестовый режим (как у Анны ZOND): заголовок x-hanna-test совпадает с HANNA_TEST_TOKEN.
// Пустая переменная = режим выключен. Сравнение за постоянное время.
export function isTestRequest(req) {
  const want = String(process.env.HANNA_TEST_TOKEN || "");
  const got = String(req.headers.get("x-hanna-test") || "");
  if (want.length < 16 || got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

export async function logTurn({ conversationId, ip, lang, userText, reply, tools, error, test, ms }) {
  try {
    if (!supa) return;
    const row = {
      conversation_id: String(conversationId).slice(0, 64),
      ip_hash: ipHash(ip),
      lang: lang || null,
      user_text: maskPII(userText),
      reply: maskPII(reply),
      tools: [...(Array.isArray(tools) ? tools.slice(0, 10) : []), ...(test ? ["test"] : [])],
      error: error ? String(error).slice(0, 300) : null,
    };
    // Колонки test и ms добавляет sql/035_chat_logs_test.sql; без них пишем как раньше (пометка test в tools).
    const { error: e1 } = await supa.from("chat_logs").insert({ ...row, test: !!test, ms: ms || null });
    if (e1) await supa.from("chat_logs").insert(row);
  } catch (e) {
    console.error("chat log:", e?.message);
  }
}
