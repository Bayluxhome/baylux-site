import { cookies, headers } from "next/headers";

// Язык по умолчанию — свойство РЫНКА (домена):
//  • явный выбор пользователя (cookie bxLang) — всегда главнее;
//  • домен .ge (грузинский рынок) или посетитель из Грузии (по закону) → грузинский;
//  • .com и прочее (международный хаб) → английский.
// Русский/другие языки доступны переключателем на любом домене.
export function getLang() {
  const c = cookies().get("bxLang")?.value;
  if (c && ["ru", "en", "ka"].includes(c)) return c;
  const h = headers();
  const host = (h.get("host") || "").toLowerCase();
  const country = h.get("x-vercel-ip-country") || "";
  if (host.endsWith(".ge") || country === "GE") return "ka";
  return "en";
}
