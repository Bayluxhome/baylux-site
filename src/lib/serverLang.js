import { cookies, headers } from "next/headers";

// Язык по умолчанию — свойство РЫНКА (домена):
//  • явный выбор пользователя (cookie bxLang) — всегда главнее;
//  • домен .ge (грузинский рынок) или посетитель из Грузии (по закону) → грузинский;
//  • .com и прочее (международный хаб) → английский.
// Русский/другие языки доступны переключателем на любом домене.
// Русскоязычные / СНГ-страны — для них на .com по умолчанию русский.
const RU_GEO = new Set(["RU", "BY", "KZ", "KG", "TJ", "TM", "UZ", "AM", "AZ", "MD", "UA"]);

export function getLang() {
  const c = cookies().get("bxLang")?.value;
  if (c && ["ru", "en", "ka"].includes(c)) return c;
  const h = headers();
  const host = (h.get("host") || "").toLowerCase();
  const country = h.get("x-vercel-ip-country") || "";
  if (host.endsWith(".ge")) return "ka";   // грузинский рынок — всегда грузинский по умолчанию (закон)
  if (country === "GE") return "ka";        // гость из Грузии (и на .com) → грузинский (закон)
  if (RU_GEO.has(country)) return "ru";     // СНГ / русскоязычные → русский
  return "en";                              // остальной мир → английский
}
