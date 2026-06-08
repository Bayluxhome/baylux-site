import crypto from "crypto";
import { ADMIN_EMAILS, ADMIN_TG_IDS } from "@/config";

// Секрет для подписи cookie сессии — производный от токена бота (только сервер).
const SECRET = crypto.createHash("sha256").update(process.env.TELEGRAM_BOT_TOKEN || "baylux-dev").digest();

export function signSession(obj) {
  const data = Buffer.from(JSON.stringify(obj)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySession(token) {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expect = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  if (sig !== expect) return null;
  try {
    const obj = JSON.parse(Buffer.from(data, "base64url").toString());
    if (obj.exp && Date.now() > obj.exp) return null;
    return obj;
  } catch {
    return null;
  }
}

// Принадлежит ли объявление текущей сессии (Telegram-id ИЛИ email).
export function owns(session, row) {
  if (!session || !row) return false;
  if (session.id != null && row.tg_user_id != null && Number(row.tg_user_id) === Number(session.id)) return true;
  if (session.email && row.owner_email && String(row.owner_email).toLowerCase() === String(session.email).toLowerCase()) return true;
  return false;
}

// Главный (супер-)админ: жёстко задан в конфиге. Только он управляет правами сотрудников.
export function isSuperAdmin(session) {
  if (!session) return false;
  if (session.email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(String(session.email).toLowerCase())) return true;
  if (session.id != null && ADMIN_TG_IDS.map(Number).includes(Number(session.id))) return true;
  return false;
}

// Есть ли у сессии конкретное право. Права (perms[]) запекаются в сессию при входе.
// session.admin === true — легаси «полный админ» из старых сессий (до гранулярных прав).
export function can(session, key) {
  if (!session) return false;
  if (isSuperAdmin(session)) return true;
  if (session.admin === true) return true;
  return Array.isArray(session.perms) && session.perms.includes(key);
}

// Есть ли у сессии вообще админ-доступ (хоть одно право). Используется как общий гейт.
export function isAdmin(session) {
  if (!session) return false;
  if (isSuperAdmin(session)) return true;
  if (session.admin === true) return true;
  return Array.isArray(session.perms) && session.perms.length > 0;
}

// Проверка подписи данных Telegram Login Widget.
export function verifyTelegramAuth(params) {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const { hash, ...data } = params;
  if (!hash) return null;
  const checkString = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join("\n");
  const secret = crypto.createHash("sha256").update(token).digest();
  const hmac = crypto.createHmac("sha256", secret).update(checkString).digest("hex");
  if (hmac !== hash) return null;
  if (Date.now() / 1000 - Number(data.auth_date || 0) > 86400) return null;
  return data;
}
