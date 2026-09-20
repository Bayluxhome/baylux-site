import { NextResponse } from "next/server";

// ───────────────────────────── Язык в адресе ─────────────────────────────
// С 21.09.2026 каждая страница живёт по трём адресам: /ru/…, /en/…, /ka/….
// Файлы маршрутов не переносили: middleware снимает префикс и переписывает запрос на
// прежний путь (/ru/catalog → /catalog), а язык передаёт заголовком x-bx-lang —
// его первым читает getLang(). Для посетителя адрес остаётся /ru/catalog.
//
// Зачем: Google обходит сайт из США, без cookie, и видел только английскую версию —
// русских и грузинских страниц для него не существовало. Теперь у каждого языка свой URL
// и hreflang (см. lib/i18nPath.altFor).
//
// Адрес без префикса (/catalog, старые ссылки из Telegram и подборок) → редирект на язык
// посетителя: cookie bxLang → домен .ge / страна GE → грузинский → СНГ → русский → английский.
const LANGS = ["ru", "en", "ka"];
const RU_GEO = new Set(["RU", "BY", "KZ", "KG", "TJ", "TM", "UZ", "AM", "AZ", "MD", "UA"]);
const LANG_RE = /^\/(ru|en|ka)(?=\/|$)/;

function pickLang(req) {
  const c = req.cookies.get("bxLang")?.value;
  if (LANGS.includes(c)) return c;
  const host = (req.headers.get("host") || "").toLowerCase();
  const country = req.headers.get("x-vercel-ip-country") || req.geo?.country || "";
  if (host.endsWith(".ge") || country === "GE") return "ka";
  if (RU_GEO.has(country)) return "ru";
  return "en";
}

// ───────────────────────────── Закрытая демо-витрина ─────────────────────────────
const COOKIE = "bx_demo";
const MAXAGE = 60 * 60 * 24 * 30; // 30 дней

function demo(req) {
  const key = process.env.DEMO_KEY || "";
  const provided = req.nextUrl.searchParams.get("key");
  const cookieVal = req.cookies.get(COOKIE)?.value;
  const allowed = !!key && (provided === key || cookieVal === key); // fail-closed
  if (!allowed) return new NextResponse("Not Found", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (provided === key) res.cookies.set(COOKIE, key, { httpOnly: true, secure: true, sameSite: "lax", path: "/demo", maxAge: MAXAGE });
  return res;
}

export function middleware(req) {
  const url = req.nextUrl;
  const { pathname } = url;

  if (pathname.startsWith("/demo")) return demo(req);

  const m = LANG_RE.exec(pathname);

  // Без префикса → редирект на языковую ветку (параметры запроса сохраняем).
  if (!m) {
    const lang = pickLang(req);
    const target = url.clone();
    target.pathname = pathname === "/" ? `/${lang}` : `/${lang}${pathname}`;
    return NextResponse.redirect(target, 308);
  }

  const lang = m[1];
  const inner = pathname.replace(LANG_RE, "") || "/";

  const headers = new Headers(req.headers);
  headers.set("x-bx-lang", lang);
  headers.set("x-bx-path", inner);

  // Режим презентации: публичная подборка и открытая из неё карточка объекта — без меню сайта.
  const colToken = url.searchParams.get("c") || "";
  const bare = inner.startsWith("/c/") || (inner.startsWith("/property/") && /^[A-Za-z0-9_-]{8,32}$/.test(colToken));
  if (bare) headers.set("x-bx-layout", "bare");

  const rewritten = url.clone();
  rewritten.pathname = inner;
  const res = NextResponse.rewrite(rewritten, { request: { headers } });
  if (bare) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  // Язык из адреса — главнее старой cookie: обновляем её, чтобы редирект с корня вёл сюда же.
  if (req.cookies.get("bxLang")?.value !== lang) res.cookies.set("bxLang", lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}

// Всё, кроме API, служебных файлов Next и статики (файлы с расширением: картинки, robots.txt, sitemap.xml…).
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
