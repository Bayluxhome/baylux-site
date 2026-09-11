// Канонические значения сделки и типа объекта + детерминированный mapping входных значений
// (задача: классификация). Тип сделки и тип недвижимости — независимые поля; неизвестное
// значение НЕ превращается в «продажа»/«квартира», а возвращается как null → на модерацию.
export const DEALS = ["sale", "rent", "daily"];

// Канонические типы хранятся по-русски (исторически так в базе, словарь typeLabel переводит подписи).
export const TYPES = ["Квартира", "Студия", "Новостройка", "Дом", "Коммерция", "Офис", "Склад", "Участок", "Гараж"];

const DEAL_ALIASES = [
  ["sale", /^(sale|sell|продажа|продам|продаю|продаётся|продается|gayidva|გაყიდვა|იყიდება)$/i],
  ["rent", /^(rent|rent_long_term|long[- ]?term|аренда|сдам|сдаю|сдаётся|сдается|долгосрочно|долгосрочная|ქირა|ქირავდება|გრძელვადიანი)$/i],
  ["daily", /^(daily|short[- ]?term|rent_daily|посуточно|посуточная|сутки|დღიურად|დღიური)$/i],
];

const TYPE_ALIASES = [
  ["Студия", /студи|studio|სტუდი/i],
  ["Новостройка", /новострой|new[- ]?build|ახალი (კორპუს|აშენ)/i],
  ["Квартира", /квартир|апартамент|apartment|flat|ბინა|აპარტამენტ/i],
  ["Дом", /\b(дом|коттедж|вилла|таунхаус|особняк)|house|villa|cottage|townhouse|სახლი|ვილა|კოტეჯ/i],
  ["Офис", /офис|office|ოფის/i],
  ["Склад", /склад|warehouse|საწყობ/i],
  ["Участок", /участ|земл|land|plot|ნაკვეთ|მიწა/i],
  ["Гараж", /гараж|паркинг|машино|garage|parking|გარაჟ|პარკინგ/i],
  ["Коммерция", /коммерц|ритейл|торгов|помещен|commercial|retail|shop|კომერც|სავაჭრო/i],
];

// Сделка: канонический код либо null (не угадываем).
export function normDeal(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  if (DEALS.includes(s)) return s;
  for (const [code, re] of DEAL_ALIASES) if (re.test(s)) return code;
  return null;
}

// Тип: канонический русский label либо null. Порядок алиасов важен: «студия»/«новостройка» — раньше «квартира».
export function normType(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  if (TYPES.includes(s)) return s;
  for (const [label, re] of TYPE_ALIASES) if (re.test(s)) return label;
  return null;
}

export const isValidDeal = (d) => DEALS.includes(d);

// Период цены по сделке (то, что хранится в listings.per).
export const perFor = (deal) => (deal === "rent" ? "в месяц" : deal === "daily" ? "в сутки" : "");
