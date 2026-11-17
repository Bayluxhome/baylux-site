// Чат Hanna (T-20261118-02, тест 18.11 02:26): страховка от смеси алфавитов внутри слова («Ивane»).
// Слово, где есть и кириллица, и латиница, приводим к основному алфавиту всего ответа
// (латиница → кириллица по простой транслитерации, кириллица → латиница). Ссылки, e-mail,
// @ники и слова с цифрами не трогаем. Модуль без импортов.
const LAT_CYR = { a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "к", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс", y: "ы", z: "з" };
const CYR_LAT = { "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya" };

const keepCase = (src, out) => (src !== src.toLowerCase() && out ? out[0].toUpperCase() + out.slice(1) : out);

function fixWord(w, toCyr) {
  const cyr = (w.match(/[а-яё]/gi) || []).length;
  const lat = (w.match(/[a-z]/gi) || []).length;
  if (!cyr || !lat) return w;
  if (toCyr) return w.replace(/[a-z]/gi, (ch) => keepCase(ch, LAT_CYR[ch.toLowerCase()] || ch));
  return w.replace(/[а-яё]/gi, (ch) => keepCase(ch, CYR_LAT[ch.toLowerCase()] ?? ch));
}

const skip = (tok) => /^(https?:|www\.)|@|\d|[/=?&#]/.test(tok); // ссылки, ники, токены с цифрами

export function fixMixedScript(text) {
  const src = String(text || "");
  const plain = src.split(/\s+/).filter((t) => !skip(t)).join(" ");
  const toCyr = (plain.match(/[а-яё]/gi) || []).length >= (plain.match(/[a-z]/gi) || []).length;
  return src.replace(/\S+/g, (tok) => (skip(tok) ? tok : tok.replace(/[A-Za-zА-Яа-яЁё]+/g, (w) => fixWord(w, toCyr))));
}
