// Нормализация и локализованное форматирование адресов (этап A задачи «адреса»).
//
// Адрес НЕ переводится как текст. Строка разбирается на компоненты — тип улицы, название,
// порядковый номер («2-й»), номер дома, корпус — и заново собирается форматтером выбранной
// локали. Название транслитерируется по фиксированным таблицам (грузинское письмо → латиница
// по национальной системе, → кириллица по традиции; кириллица → латиница/грузинское письмо).
// Латинские названия (бренды ЖК, уже английские) не меняются.
//
// Что это даёт: единый порядок «27 Shartava Street» / «ул. Шартава, 27» / «შარტავას ქუჩა 27»,
// никаких «St..», «dom», «Podem», грузинских букв в русской версии, двойных пробелов и точек.
// Чего не даёт: «утверждённых» названий улиц — для этого нужен справочник (этап B).
// Модуль без импортов и без побочных эффектов: его можно проверять отдельно.

// ---------- таблицы ----------
const KA_LAT = { "ა": "a", "ბ": "b", "გ": "g", "დ": "d", "ე": "e", "ვ": "v", "ზ": "z", "თ": "t", "ი": "i", "კ": "k", "ლ": "l", "მ": "m", "ნ": "n", "ო": "o", "პ": "p", "ჟ": "zh", "რ": "r", "ს": "s", "ტ": "t", "უ": "u", "ფ": "p", "ქ": "k", "ღ": "gh", "ყ": "q", "შ": "sh", "ჩ": "ch", "ც": "ts", "ძ": "dz", "წ": "ts", "ჭ": "ch", "ხ": "kh", "ჯ": "j", "ჰ": "h" };
const KA_CYR = { "ა": "а", "ბ": "б", "გ": "г", "დ": "д", "ე": "е", "ვ": "в", "ზ": "з", "თ": "т", "ი": "и", "კ": "к", "ლ": "л", "მ": "м", "ნ": "н", "ო": "о", "პ": "п", "ჟ": "ж", "რ": "р", "ს": "с", "ტ": "т", "უ": "у", "ფ": "п", "ქ": "к", "ღ": "г", "ყ": "к", "შ": "ш", "ჩ": "ч", "ც": "ц", "ძ": "дз", "წ": "ц", "ჭ": "ч", "ხ": "х", "ჯ": "дж", "ჰ": "х" };
const CYR_LAT = { "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya" };
const CYR_KA = { "а": "ა", "б": "ბ", "в": "ვ", "г": "გ", "д": "დ", "е": "ე", "ё": "ო", "ж": "ჟ", "з": "ზ", "и": "ი", "й": "ი", "к": "კ", "л": "ლ", "м": "მ", "н": "ნ", "о": "ო", "п": "პ", "р": "რ", "с": "ს", "т": "ტ", "у": "უ", "ф": "ფ", "х": "ხ", "ц": "ც", "ч": "ჩ", "ш": "შ", "щ": "შჩ", "ъ": "", "ы": "ი", "ь": "", "э": "ე", "ю": "იუ", "я": "ია" };

// Типы улиц: ключ → подписи по локалям и все распознаваемые написания.
const TYPES = {
  street:     { ru: "ул.",     en: "Street",     ka: "ქუჩა",       aliases: ["ул", "улица", "улице", "улицы", "st", "str", "street", "ქ", "ქუჩა"] },
  avenue:     { ru: "просп.",  en: "Avenue",     ka: "გამზირი",    aliases: ["пр", "просп", "проспект", "проспекте", "ave", "avenue", "гამზ", "გამზ", "გამზირი"] },
  lane:       { ru: "пер.",    en: "Lane",       ka: "შესახვევი",  aliases: ["пер", "переулок", "переулке", "ln", "lane", "შეს", "შესახვევი"] },
  ascent:     { ru: "подъём",  en: "Ascent",     ka: "აღმართი",    aliases: ["подъем", "подъём", "подьем", "спуск", "ascent", "აღმ", "აღმართი"] },
  square:     { ru: "пл.",     en: "Square",     ka: "მოედანი",    aliases: ["пл", "площадь", "sq", "square", "მოედანი"] },
  highway:    { ru: "ш.",      en: "Highway",    ka: "გზატკეცილი", aliases: ["ш", "шоссе", "highway", "hwy", "გზატკეცილი", "გზატკ"] },
  deadend:    { ru: "туп.",    en: "Dead End",   ka: "ჩიხი",       aliases: ["туп", "тупик", "ჩიხი"] },
  passage:    { ru: "пр-д",    en: "Passage",    ka: "გასასვლელი", aliases: ["проезд", "пр-д", "passage"] },
  boulevard:  { ru: "бул.",    en: "Boulevard",  ka: "ბულვარი",    aliases: ["бул", "бульвар", "blvd", "boulevard", "ბულვარი"] },
  embankment: { ru: "наб.",    en: "Embankment", ka: "სანაპირო",   aliases: ["наб", "набережная", "embankment", "სანაპირო"] },
  turn:       { ru: "поворот", en: "Turn",       ka: "მოსახვევი",  aliases: ["поворот", "turn", "მოსახვევი"] },
  settlement: { ru: "пос.",    en: "Settlement", ka: "დასახლება",  aliases: ["пос", "посёлок", "поселок", "settlement", "დას", "დასახლება"] },
  micro:      { ru: "мкр.",    en: "Microdistrict", ka: "მიკრორაიონი", aliases: ["мкр", "микрорайон", "მ/რ", "მიკრორაიონი"] },
};
const TYPE_BY_ALIAS = {};
for (const [key, v] of Object.entries(TYPES)) for (const a of v.aliases) TYPE_BY_ALIAS[a.toLowerCase()] = key;

// Служебные слова, которые не являются частью названия и не должны попадать в вывод.
const HOUSE_WORDS = ["д", "дом", "house", "სახლი", "№", "#", "no", "n"];
const BLOCK_WORDS = ["к", "корп", "корпус", "блок", "block", "bldg", "კორპ", "კორპუსი", "ბლოკი"];

// ---------- утилиты ----------
const hasKa = (s) => /[ა-ჿ]/.test(s);
const hasCyr = (s) => /[А-Яа-яЁё]/.test(s);
const hasLat = (s) => /[A-Za-z]/.test(s);

// Устаревшие/заглавные грузинские буквы (Asomtavruli U+10A0–10C5, Mtavruli U+1C90–1CBF) →
// современное письмо (Mkhedruli). Иначе «Ადლიის» начинается с символа другого алфавита.
function fixKaUnicode(s) {
  return s.replace(/[Ⴀ-Ⴥ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x30))
          .replace(/[Ა-Ჿ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x0BC0));
}

function clean(s) {
  return fixKaUnicode(String(s || "").normalize("NFC"))
    .replace(/[«»"“”]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\.{2,}/g, ".").replace(/,{2,}/g, ",")
    .replace(/\s*,\s*/g, ", ").replace(/\s*\.\s*/g, ". ")
    .replace(/\s+/g, " ").replace(/^[\s,.\-–—]+|[\s,.\-–—]+$/g, "")
    .trim();
}

// Заглавная только для латиницы/кириллицы: у грузинского письма регистра нет, и toUpperCase
// превращает буквы в Mtavruli (другой блок Unicode).
const upFirst = (s) => (/^[a-zа-яё]/.test(s) ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function translit(word, map) {
  return word.split("").map((ch) => {
    const low = ch.toLowerCase();
    if (!(low in map)) return ch;
    const out = map[low];
    return ch !== low && out ? upFirst(out) : out;
  }).join("");
}
// Служебные слова внутри названий, которые остаются строчными («Леха и Марии», «Rustaveli and …»).
const SMALL = new Set(["и", "да", "i", "de", "da", "and", "of", "the", "von", "van"]);
// Каждое слово с заглавной; дефисные части тоже («Ахмед-Бей»). Не трогаем аббревиатуры/числа.
const titleCase = (s) => s.split(" ").map((w, i) => w.split("-").map((p) => {
  if (/^\d/.test(p) || /^[A-ZА-ЯЁ]{2,}$/.test(p) || /[ა-ჿ]/.test(p)) return p;
  if (i > 0 && SMALL.has(p.toLowerCase())) return p.toLowerCase();
  return upFirst(p.toLowerCase());
}).join("-")).join(" ");

// ---------- разбор ----------
// Возвращает { raw, type, ordinal, name, house, block, nameScript } либо null для пустых.
export function parseAddress(raw) {
  const s = clean(raw);
  if (!s) return null;
  let rest = s;
  let house = "", block = "", ordinal = "", type = null;

  // корпус: «корп. 2», «к. 2», «блок B»
  const bm = rest.match(new RegExp(`(?:^|[\\s,])(${BLOCK_WORDS.join("|")})\\.?\\s*([0-9]+[A-Za-zА-Яа-я\\u10D0-\\u10FF]?|[A-Za-zА-Яа-я\\u10D0-\\u10FF])(?=$|[\\s,])`, "i"));
  if (bm) { block = bm[2]; rest = clean(rest.replace(bm[0], " ")); }

  // номер дома: в конце «…, 27», «… дом 31», «… 27а», «… 10/2»; или в начале по-английски «27 Shartava …»
  const hn = "([0-9]{1,4}(?:[/-][0-9]{1,3})?[A-Za-zА-Яа-я\\u10D0-\\u10FF]?)";
  let hm = rest.match(new RegExp(`(?:^|[\\s,])(?:(?:${HOUSE_WORDS.join("|")})\\.?\\s*)?${hn}\\s*$`, "i"));
  if (hm && !/^\d+$/.test(rest.trim())) { house = hm[1]; rest = rest.slice(0, hm.index).trim(); }
  else {
    hm = rest.match(new RegExp(`^${hn}\\s+(?=\\S)`));
    if (hm) { house = hm[1]; rest = rest.slice(hm[0].length); }
  }
  // «дом» без номера в середине («Лермонтова, dom 31» уже разобран выше)
  rest = clean(rest.replace(/(?:^|[\s,])(д\.?|дом|dom|house)(?=$|[\s,])/gi, " "));

  // слова: тип улицы и порядковый номер могут стоять в любом месте
  const words = rest.split(/[\s,]+/).filter(Boolean);
  const nameWords = [];
  for (const w of words) {
    const key = w.replace(/\.$/, "").toLowerCase();
    if (!type && TYPE_BY_ALIAS[key]) { type = TYPE_BY_ALIAS[key]; continue; }
    const om = w.match(/^(\d{1,2})-?(й|я|ой|ый|ая|ий|ая|е|y|st|nd|rd|th|ე)?\.?$/i);
    if (om && !ordinal && nameWords.length === 0) { ordinal = om[1]; continue; }
    if (/^(dom|ulitsa|ul|pereulok|per|podem|podyom|prospekt|pr)\.?$/i.test(w)) { // транслит русских служебных слов из старых данных
      const k = { dom: null, ulitsa: "street", ul: "street", pereulok: "lane", per: "lane", podem: "ascent", podyom: "ascent", prospekt: "avenue", pr: "avenue" }[w.replace(/\.$/, "").toLowerCase()];
      if (k && !type) type = k;
      continue;
    }
    // Инициал («Ш.», «Sh.») — точку сохраняем; у остальных слов хвостовую точку убираем.
    nameWords.push(/^[A-Za-zА-Яа-яЁёა-ჿ]{1,2}\.$/.test(w) ? w : w.replace(/\.$/, ""));
  }
  const name = nameWords.join(" ");
  const nameScript = hasKa(name) ? "ka" : hasCyr(name) ? "ru" : hasLat(name) ? "en" : "none";
  return { raw: s, type, ordinal, name, house, block, nameScript };
}

// ---------- название на нужном письме ----------
function nameFor(p, lang) {
  const n = p.name;
  if (!n) return "";
  if (p.nameScript === "en") return titleCase(n);            // латиница (бренд/уже английское) — только регистр
  if (lang === "ru") return p.nameScript === "ka" ? titleCase(translit(n, KA_CYR)) : titleCase(n);
  if (lang === "en") return titleCase(translit(n, p.nameScript === "ka" ? KA_LAT : CYR_LAT));
  if (lang === "ka") return p.nameScript === "ka" ? n : translit(n, CYR_KA);
  return n;
}
// Буква в номере дома («12а») — на письме локали.
function houseFor(h, lang) {
  if (!h) return "";
  const m = h.match(/^(.*?)([A-Za-zА-Яа-яЁёა-ჿ])$/);
  if (!m) return h;
  const l = m[2].toLowerCase();
  if (lang === "en") return m[1] + (CYR_LAT[l] || KA_LAT[l] || l);
  if (lang === "ka") return m[1] + (CYR_KA[l] || l);
  return m[1] + (KA_CYR[l] || l);
}

const ORD = {
  ru: (n) => `${n}-й`,
  en: (n) => n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10 > 3 || [11, 12, 13].includes(n % 100) ? 0 : n % 10] || "th"),
  ka: (n) => `${n}-ე`,
};

// ---------- сборка ----------
// formatAddress(raw, lang, kind): kind === "complex" — название ЖК (бренд), только чистка.
export function formatAddress(raw, lang = "ru", kind) {
  const p = parseAddress(raw);
  if (!p) return "";
  // ЖК-бренд или строка без названия улицы (напр. «ул. 3» из битых данных) — отдаём как есть,
  // собирать «3 Street» из одного номера нельзя.
  if (kind === "complex" || !p.name) return p.raw;
  const name = nameFor(p, lang);
  const T = p.type ? TYPES[p.type] : null;
  const house = houseFor(p.house, lang) + (p.block ? (lang === "en" ? ` Bldg ${p.block}` : lang === "ka" ? ` კორპ. ${p.block}` : ` корп. ${p.block}`) : "");

  if (lang === "en") {
    // «27 Shartava Street», «10 2nd Memed Abashidze Lane»; без типа — «27 Shartava»
    const parts = [house, p.ordinal && ORD.en(+p.ordinal), name, T && T.en].filter(Boolean);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }
  if (lang === "ka") {
    // «შარტავას ქუჩა 27». Родительный падеж к названию только если оно НЕ грузинское
    // в оригинале (грузинское уже стоит в нужной форме) и тип известен.
    let nm = name;
    // родительный падеж — только к транслитерированному с кириллицы (латинские бренды не трогаем)
    if (T && p.nameScript === "ru" && nm) nm = /[აეიოუ]$/.test(nm) ? nm + "ს" : nm + "ის";
    const parts = [p.ordinal && ORD.ka(+p.ordinal), nm, T && T.ka, house].filter(Boolean);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }
  // ru: «ул. Шартава, 27», «2-й пер. Мемеда Абашидзе, 10»
  const head = [p.ordinal && ORD.ru(+p.ordinal), T && T.ru, name].filter(Boolean).join(" ");
  return upFirst((house ? `${head}, ${house}` : head).replace(/\s+/g, " ").trim());
}

// Ключ здания для группировки: не зависит от языка/оформления написания.
export function addressKey(raw) {
  const p = parseAddress(raw);
  if (!p) return "";
  const nm = p.nameScript === "ka" ? translit(p.name, KA_LAT) : p.nameScript === "ru" ? translit(p.name, CYR_LAT) : p.name;
  return [p.type || "", p.ordinal, nm.toLowerCase().replace(/[^a-z0-9]/g, ""), p.house.toLowerCase(), p.block.toLowerCase()].join("|");
}
