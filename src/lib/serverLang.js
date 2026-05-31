import { cookies, headers } from "next/headers";

// Язык для серверных компонентов: cookie bxLang, иначе гео (Грузия → ka), иначе ru.
export function getLang() {
  const c = cookies().get("bxLang")?.value;
  if (c && ["ru", "en", "ka"].includes(c)) return c;
  const country = headers().get("x-vercel-ip-country") || "";
  return country === "GE" ? "ka" : "ru";
}
