// Язык в адресе: /ru/…, /en/…, /ka/… (с 21.09.2026).
// Безопасно для клиента и сервера — без импортов next/headers.
export const LANGS = ["ru", "en", "ka"];
export const DEFAULT_LANG = "en"; // x-default для hreflang: международная версия

const RE = /^\/(ru|en|ka)(?=\/|$)/;

export function langOfPath(p) {
  const m = RE.exec(p || "");
  return m ? m[1] : null;
}

// «/ru/catalog?x=1» → «/catalog?x=1»; «/ru» → «/»
export function stripLang(p) {
  const s = String(p || "/").replace(RE, "");
  return s === "" ? "/" : s;
}

// «/catalog» + ru → «/ru/catalog»; «/» + ru → «/ru»
export function withLang(lang, p) {
  const s = stripLang(p);
  return s === "/" ? `/${lang}` : `/${lang}${s}`;
}

// Блок alternates для metadata страницы: канонический адрес на языке страницы + hreflang.
export function altFor(lang, path) {
  return {
    canonical: withLang(lang, path),
    languages: {
      ru: withLang("ru", path),
      en: withLang("en", path),
      ka: withLang("ka", path),
      "x-default": withLang(DEFAULT_LANG, path),
    },
  };
}
