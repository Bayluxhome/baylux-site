import { NextResponse } from "next/server";

// Закрытая демо-витрина ЖК (для переговоров с застройщиками).
// Доступ только по секретной ссылке /demo/...?key=<DEMO_KEY> (ключ в env Vercel).
// По валидному ключу ставим cookie на 30 дней. Без ключа/cookie — чистый 404
// (чтобы не светить, что по этому пути что-то есть). Индексация запрещена заголовком.
const COOKIE = "bx_demo";
const MAXAGE = 60 * 60 * 24 * 30; // 30 дней

export function middleware(req) {
  // Публичная подборка /c/<token> — «режим презентации» для клиента риелтора.
  // Ставим заголовок запроса, по которому root layout НЕ рендерит глобальные Header/Footer.
  // Решение серверное: меню отсутствует уже в HTML, не мелькает до гидрации и не даёт
  // клиенту уйти из подборки в каталог. Подборки не индексируем (см. также robots в metadata).
  // Страница объекта, открытая ИЗ подборки (/property/<slug>?c=<token>), — часть той же
  // презентации: меню тоже не показываем, наверху даём «Вернуться к подборке».
  const colToken = req.nextUrl.searchParams.get("c") || "";
  const fromCollection = req.nextUrl.pathname.startsWith("/property/") && /^[A-Za-z0-9_-]{8,32}$/.test(colToken);

  if (req.nextUrl.pathname.startsWith("/c/") || fromCollection) {
    const headers = new Headers(req.headers);
    headers.set("x-bx-layout", "bare");
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Дальше — ТОЛЬКО закрытая демо-витрина. Проверка обязательна: в matcher теперь есть
  // /property/*, и без неё обычная карточка объекта (без ?c=) улетела бы в 404 ниже.
  if (!req.nextUrl.pathname.startsWith("/demo")) return NextResponse.next();

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

// Только /demo/* (закрытая витрина), /c/* (подборка) и /property/* (там режим презентации
// включается лишь при валидном ?c=<token>). Остальной сайт middleware не трогает.
export const config = { matcher: ["/demo/:path*", "/c/:path*", "/property/:path*"] };
