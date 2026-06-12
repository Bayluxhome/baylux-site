import { NextResponse } from "next/server";

// Закрытая демо-витрина ЖК (для переговоров с застройщиками).
// Доступ только по секретной ссылке /demo/...?key=<DEMO_KEY> (ключ в env Vercel).
// По валидному ключу ставим cookie на 30 дней. Без ключа/cookie — чистый 404
// (чтобы не светить, что по этому пути что-то есть). Индексация запрещена заголовком.
const COOKIE = "bx_demo";
const MAXAGE = 60 * 60 * 24 * 30; // 30 дней

export function middleware(req) {
  const key = process.env.DEMO_KEY || "";
  const provided = req.nextUrl.searchParams.get("key");
  const cookieVal = req.cookies.get(COOKIE)?.value;

  // fail-closed: если DEMO_KEY не задан — доступа нет ни у кого.
  const allowed = !!key && (provided === key || cookieVal === key);

  if (!allowed) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  // Зашли по ключу — выдаём cookie, дальше пускаем без ключа.
  if (provided === key) {
    res.cookies.set(COOKIE, key, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/demo",
      maxAge: MAXAGE,
    });
  }
  return res;
}

// Строго только /demo/* — остальной сайт middleware не трогает.
export const config = { matcher: ["/demo/:path*"] };
