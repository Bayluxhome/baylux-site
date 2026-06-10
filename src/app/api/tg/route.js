import { supa } from "@/lib/supabase";
import { slugify, cleanAddress } from "@/data/sheet";
import { translateDescriptions, translateNames } from "@/lib/translate";
import { watermarkBuffer } from "@/lib/watermarkServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID; // чат CEO для модерации
const CHANNEL = process.env.TELEGRAM_CHANNEL || ""; // основной канал (Батуми/побережье)
const CH_BATUMI = CHANNEL;                                  // запад/побережье
const CH_TBILISI = process.env.TELEGRAM_CHANNEL_TBILISI || ""; // восток
const HUB_BATUMI = { lat: 41.6168, lng: 41.6367 };
const HUB_TBILISI = { lat: 41.7151, lng: 44.8271 };
// Выбираем канал по ближайшему хабу (по координатам объекта), фолбэк — по названию.
function pickChannel(row) {
  if (!CH_TBILISI) return CH_BATUMI; // второго канала нет — всё в основной
  const lat = Number(row.lat), lng = Number(row.lng);
  if (isFinite(lat) && isFinite(lng) && (lat || lng)) {
    const d2 = (h) => (lat - h.lat) ** 2 + (lng - h.lng) ** 2;
    return d2(HUB_TBILISI) < d2(HUB_BATUMI) ? CH_TBILISI : CH_BATUMI;
  }
  return /тбилиси|рустави|мцхета|гори|телави|гудаури|бакуриани|tbilisi|rustavi/i.test(String(row.district || "")) ? CH_TBILISI : CH_BATUMI;
}
const API = `https://api.telegram.org/bot${TOKEN}`;
const SECRET = (TOKEN || "").slice(-24).replace(/[^A-Za-z0-9_-]/g, "") || "baylux";
const SITE = "https://bayluxhome.com";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const DEAL_RU = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };
const COMPLEX_TYPES = /новострой/i;

// ============ ЯЗЫКИ ДИАЛОГА БОТА ============
const BOT_LANGS = ["ru", "en", "ka"];

// Каталоги выбора: индексы выровнены между языками, канон = русский (как на сайте)
const CITIES_C = ["Батуми", "Тбилиси", "Кутаиси", "Гонио", "Кобулети", "Чакви"];
const CITIES_L = {
  ru: CITIES_C,
  en: ["Batumi", "Tbilisi", "Kutaisi", "Gonio", "Kobuleti", "Chakvi"],
  ka: ["ბათუმი", "თბილისი", "ქუთაისი", "გონიო", "ქობულეთი", "ჩაქვი"],
};
const TYPES_C = ["Квартира", "Студия", "Дом", "Коммерция", "Офис", "Участок", "Гараж"];
const TYPES_L = {
  ru: TYPES_C,
  en: ["Apartment", "Studio", "House", "Commercial", "Office", "Land plot", "Garage"],
  ka: ["ბინა", "სტუდია", "სახლი", "კომერციული", "ოფისი", "მიწის ნაკვეთი", "გარაჟი"],
};
const AMEN_C = ["Мебель", "Балкон", "Терраса", "Парковка", "Ремонт «евро»", "Без ремонта", "Кондиционер", "Лифт"];
const AMEN_L = {
  ru: AMEN_C,
  en: ["Furniture", "Balcony", "Terrace", "Parking", "Renovated", "No renovation", "Air conditioning", "Elevator"],
  ka: ["ავეჯი", "აივანი", "ტერასა", "პარკინგი", "ევრორემონტი", "რემონტის გარეშე", "კონდიციონერი", "ლიფტი"],
};
// localized label -> канон (ищем по всем языкам)
function canon(catL, catC, text) {
  const low = String(text || "").trim().toLowerCase();
  for (const lng of BOT_LANGS) {
    const i = catL[lng].findIndex((x) => x.toLowerCase() === low);
    if (i >= 0) return catC[i];
  }
  return null;
}

const T = {
  ru: {
    menu_greet: "👋 Baylux — кабинет владельца объектов.\n🌐 Сайт: " + SITE + "\nВыберите действие:",
    menu_choose: "Выберите действие:", menu_title: "Главное меню Baylux:",
    btn_add: "➕ Добавить объявление", btn_my: "📋 Мои объявления", btn_site: "🌐 Сайт",
    back: "⬅️ Назад", cancel: "✖️ Отмена", skip: "Пропустить",
    cancelled: "Отменено. Выберите действие:",
    q_lang: "Выберите язык объявления:\nChoose listing language:\nაირჩიეთ განცხადების ენა:",
    q_country: "Страна объекта? (Сейчас работаем в Грузии 🇬🇪)", kb_georgia: "🇬🇪 Грузия",
    country_only_ge: "Пока размещаем объекты только в Грузии 🇬🇪. Нажмите «🇬🇪 Грузия».",
    q_city: "Город?",
    q_deal: "Тип сделки?", deal_sale: "Продажа", deal_rent: "Аренда", deal_daily: "Посуточно",
    q_type: "Тип объекта?",
    q_complex: "Название ЖК / дома — по желанию. Напишите или «Пропустить».",
    q_address: "Адрес объекта (улица и номер дома). Например: ул. Шерифа Химшиашвили, 1",
    q_geo: "Пришлите точку на карте — так объект точно встанет на карту сайта.\n📎 (скрепка) → Геопозиция → «Выбрать на карте».\n🛰 Совет: переключите карту в режим «Спутник» и поставьте точку прямо на нужный дом.\nЕсли не получается — напишите «пропустить».",
    geo_auto: (addr) => `📍 Поставил точку по адресу «${addr}». Проверьте на карте выше.\n• Если верно — нажмите «✅ Точка верна».\n• Если неточно — пришлите свою точку: 📎 → Геопозиция → «Выбрать на карте» (лучше 🛰 «Спутник»).`,
    geo_ok: "✅ Точка верна",
    q_price: "Цена — только число. Например: 74000",
    q_currency: "Валюта цены?", cur_usd: "💵 USD ($)", cur_gel: "🇬🇪 GEL (₾)",
    q_area: "Площадь в м²? (число, например 56)",
    q_rooms: "Сколько комнат? (число; студия/коммерция — 0)",
    q_bathrooms: "Сколько санузлов? (число; или «Пропустить»)",
    q_floor: "Этаж? Например: 10/22 (этаж/всего). Для дома/участка — поставьте «—».",
    q_year: "Год постройки? (число; или «Пропустить»)",
    q_about: "Краткое описание объекта.",
    amen_q: (sel) => `Удобства — нажимайте подходящие (отметятся ✅), затем «✔️ Готово».\nВыбрано: ${sel.length ? sel.join(", ") : "—"}`,
    amen_done: "✔️ Готово",
    q_no_commission: "Без комиссии с покупателя?", nc_yes: "✅ Без комиссии", nc_no: "С комиссией",
    q_photos: "Пришлите фото (по одному, до 8). Когда закончите — /done. Можно без фото — сразу /done.",
    photo_added: (n) => `📷 Фото добавлено (${n}). Ещё или /done.`,
    photo_fail: "Не удалось загрузить фото, попробуйте другое или /done.",
    photo_need: "Пришлите фото или /done.",
    q_facade: "🏢 Фото дома / фасада — по желанию (для карточки дома). Пришлите одно фото дома или «Пропустить».",
    facade_added: "✅ Фото фасада добавлено.",
    q_contact: "Контактный номер (Грузия, +995).\nПросто напишите номер, например: +995 555 12 34 56.\n(Или нажмите кнопку ниже, чтобы поделиться своим номером.)",
    contact_share: "📱 Поделиться номером",
    contact_bad: "❗ Сейчас принимаем только грузинские номера (+995).\nНапишите номер, например: +995 555 12 34 56.",
    q_tg: "Последний шаг (по желанию): Telegram для связи — @username.\nНапишите ник или нажмите «Пропустить».",
    save_error: "Ошибка сохранения, попробуйте позже. /start",
    done_seller: "✅ Спасибо! Объявление отправлено на модерацию. Опубликуем после проверки и сообщим вам.",
    my_empty: "У вас пока нет объявлений. Нажмите «➕ Добавить объявление».",
    my_title: "📋 Ваши объявления:", my_tail: "Вход и детали на сайте: ",
    st_pending: "⏳ на модерации", st_approved: "✅ опубликовано", st_rejected: "🚫 снято",
    site_msg: "🌐 " + SITE + "/my — ваши объявления и вход на сайт.",
    published: (type, name) => `🎉 Ваш объект (${type} · ${name}) опубликован: ${SITE}`,
  },
  en: {
    menu_greet: "👋 Baylux — owner's dashboard.\n🌐 Website: " + SITE + "\nChoose an action:",
    menu_choose: "Choose an action:", menu_title: "Baylux main menu:",
    btn_add: "➕ Add a listing", btn_my: "📋 My listings", btn_site: "🌐 Website",
    back: "⬅️ Back", cancel: "✖️ Cancel", skip: "Skip",
    cancelled: "Cancelled. Choose an action:",
    q_lang: "Выберите язык объявления:\nChoose listing language:\nაირჩიეთ განცხადების ენა:",
    q_country: "Property country? (We currently operate in Georgia 🇬🇪)", kb_georgia: "🇬🇪 Georgia",
    country_only_ge: "For now we only list properties in Georgia 🇬🇪. Tap “🇬🇪 Georgia”.",
    q_city: "City?",
    q_deal: "Deal type?", deal_sale: "Sale", deal_rent: "Rent", deal_daily: "Daily",
    q_type: "Property type?",
    q_complex: "Complex / building name — optional. Type it or tap “Skip”.",
    q_address: "Property address (street and number). E.g.: Sherif Khimshiashvili St, 1",
    q_geo: "Send a map point so the property lands exactly on the site map.\n📎 (clip) → Location → “Pick on map”.\n🛰 Tip: switch the map to “Satellite” and drop the point on the building.\nIf it doesn't work — type “skip”.",
    geo_auto: (addr) => `📍 I set a point at “${addr}”. Check the map above.\n• If correct — tap “✅ Point is correct”.\n• If not — send your own point: 📎 → Location → “Pick on map” (better in 🛰 “Satellite”).`,
    geo_ok: "✅ Point is correct",
    q_price: "Price — number only. E.g.: 74000",
    q_currency: "Price currency?", cur_usd: "💵 USD ($)", cur_gel: "🇬🇪 GEL (₾)",
    q_area: "Area in m²? (number, e.g. 56)",
    q_rooms: "How many rooms? (number; studio/commercial — 0)",
    q_bathrooms: "How many bathrooms? (number; or “Skip”)",
    q_floor: "Floor? E.g.: 10/22 (floor/total). For a house/land — put “—”.",
    q_year: "Year built? (number; or “Skip”)",
    q_about: "Short description of the property.",
    amen_q: (sel) => `Amenities — tap the ones that apply (marked ✅), then “✔️ Done”.\nSelected: ${sel.length ? sel.join(", ") : "—"}`,
    amen_done: "✔️ Done",
    q_no_commission: "No commission from the buyer?", nc_yes: "✅ No commission", nc_no: "With commission",
    q_photos: "Send photos (one by one, up to 8). When done — /done. You can skip photos — just /done.",
    photo_added: (n) => `📷 Photo added (${n}). More or /done.`,
    photo_fail: "Couldn't upload the photo, try another or /done.",
    photo_need: "Send a photo or /done.",
    q_facade: "🏢 Building / facade photo — optional (for the building card). Send one photo of the building or “Skip”.",
    facade_added: "✅ Facade photo added.",
    q_contact: "Contact number (Georgia, +995).\nJust type the number, e.g.: +995 555 12 34 56.\n(Or tap the button below to share your number.)",
    contact_share: "📱 Share my number",
    contact_bad: "❗ We currently accept only Georgian numbers (+995).\nType the number, e.g.: +995 555 12 34 56.",
    q_tg: "Last step (optional): Telegram for contact — @username.\nType the handle or tap “Skip”.",
    save_error: "Save error, please try later. /start",
    done_seller: "✅ Thank you! The listing was sent for moderation. We'll publish it after review and let you know.",
    my_empty: "You have no listings yet. Tap “➕ Add a listing”.",
    my_title: "📋 Your listings:", my_tail: "Login and details on the site: ",
    st_pending: "⏳ under review", st_approved: "✅ published", st_rejected: "🚫 removed",
    site_msg: "🌐 " + SITE + "/my — your listings and site login.",
    published: (type, name) => `🎉 Your property (${type} · ${name}) is published: ${SITE}`,
  },
  ka: {
    menu_greet: "👋 Baylux — მფლობელის კაბინეტი.\n🌐 საიტი: " + SITE + "\nაირჩიეთ მოქმედება:",
    menu_choose: "აირჩიეთ მოქმედება:", menu_title: "Baylux მთავარი მენიუ:",
    btn_add: "➕ განცხადების დამატება", btn_my: "📋 ჩემი განცხადებები", btn_site: "🌐 საიტი",
    back: "⬅️ უკან", cancel: "✖️ გაუქმება", skip: "გამოტოვება",
    cancelled: "გაუქმდა. აირჩიეთ მოქმედება:",
    q_lang: "Выберите язык объявления:\nChoose listing language:\nაირჩიეთ განცხადების ენა:",
    q_country: "ობიექტის ქვეყანა? (ამჟამად ვმუშაობთ საქართველოში 🇬🇪)", kb_georgia: "🇬🇪 საქართველო",
    country_only_ge: "ამჟამად ვათავსებთ ობიექტებს მხოლოდ საქართველოში 🇬🇪. დააჭირეთ „🇬🇪 საქართველო“.",
    q_city: "ქალაქი?",
    q_deal: "გარიგების ტიპი?", deal_sale: "გაყიდვა", deal_rent: "ქირა", deal_daily: "დღიურად",
    q_type: "ობიექტის ტიპი?",
    q_complex: "კომპლექსის / სახლის სახელი — სურვილისამებრ. დაწერეთ ან „გამოტოვება“.",
    q_address: "ობიექტის მისამართი (ქუჩა და ნომერი). მაგ.: შერიფ ხიმშიაშვილის ქ. 1",
    q_geo: "გამოგზავნეთ წერტილი რუკაზე — ასე ობიექტი ზუსტად დადგება საიტის რუკაზე.\n📎 → მდებარეობა → „რუკაზე არჩევა“.\n🛰 რჩევა: გადართეთ რუკა „სატელიტ“ რეჟიმში და დასვით წერტილი შენობაზე.\nთუ არ გამოდის — დაწერეთ „გამოტოვება“.",
    geo_auto: (addr) => `📍 დავსვი წერტილი მისამართზე „${addr}“. შეამოწმეთ რუკა ზემოთ.\n• თუ სწორია — დააჭირეთ „✅ წერტილი სწორია“.\n• თუ არა — გამოგზავნეთ თქვენი წერტილი: 📎 → მდებარეობა → „რუკაზე არჩევა“ (სჯობს 🛰 „სატელიტი“).`,
    geo_ok: "✅ წერტილი სწორია",
    q_price: "ფასი — მხოლოდ რიცხვი. მაგ.: 74000",
    q_currency: "ფასის ვალუტა?", cur_usd: "💵 USD ($)", cur_gel: "🇬🇪 GEL (₾)",
    q_area: "ფართობი მ²-ში? (რიცხვი, მაგ. 56)",
    q_rooms: "რამდენი ოთახი? (რიცხვი; სტუდია/კომერციული — 0)",
    q_bathrooms: "რამდენი სველი წერტილი? (რიცხვი; ან „გამოტოვება“)",
    q_floor: "სართული? მაგ.: 10/22 (სართული/სულ). სახლის/მიწისთვის — დასვით „—“.",
    q_year: "აშენების წელი? (რიცხვი; ან „გამოტოვება“)",
    q_about: "ობიექტის მოკლე აღწერა.",
    amen_q: (sel) => `კეთილმოწყობა — დააჭირეთ შესაბამისებს (მოინიშნება ✅), შემდეგ „✔️ მზადაა“.\nარჩეული: ${sel.length ? sel.join(", ") : "—"}`,
    amen_done: "✔️ მზადაა",
    q_no_commission: "მყიდველისგან საკომისიოს გარეშე?", nc_yes: "✅ უსაკომისიო", nc_no: "საკომისიოთი",
    q_photos: "გამოგზავნეთ ფოტოები (სათითაოდ, 8-მდე). დასრულებისას — /done. ფოტოების გარეშეც შეიძლება — პირდაპირ /done.",
    photo_added: (n) => `📷 ფოტო დაემატა (${n}). კიდევ ან /done.`,
    photo_fail: "ფოტო ვერ აიტვირთა, სცადეთ სხვა ან /done.",
    photo_need: "გამოგზავნეთ ფოტო ან /done.",
    q_facade: "🏢 შენობის / ფასადის ფოტო — სურვილისამებრ (შენობის ბარათისთვის). გამოგზავნეთ ერთი ფოტო ან „გამოტოვება“.",
    facade_added: "✅ ფასადის ფოტო დაემატა.",
    q_contact: "საკონტაქტო ნომერი (საქართველო, +995).\nუბრალოდ დაწერეთ ნომერი, მაგ.: +995 555 12 34 56.\n(ან დააჭირეთ ქვემოთ ღილაკს ნომრის გასაზიარებლად.)",
    contact_share: "📱 ნომრის გაზიარება",
    contact_bad: "❗ ამჟამად ვიღებთ მხოლოდ ქართულ ნომრებს (+995).\nდაწერეთ ნომერი, მაგ.: +995 555 12 34 56.",
    q_tg: "ბოლო ნაბიჯი (სურვილისამებრ): Telegram კონტაქტისთვის — @username.\nდაწერეთ ან დააჭირეთ „გამოტოვება“.",
    save_error: "შენახვის შეცდომა, სცადეთ მოგვიანებით. /start",
    done_seller: "✅ გმადლობთ! განცხადება გაიგზავნა მოდერაციაზე. შემოწმების შემდეგ გამოვაქვეყნებთ და შეგატყობინებთ.",
    my_empty: "ჯერ არ გაქვთ განცხადებები. დააჭირეთ „➕ განცხადების დამატება“.",
    my_title: "📋 თქვენი განცხადებები:", my_tail: "შესვლა და დეტალები საიტზე: ",
    st_pending: "⏳ მოდერაციაზე", st_approved: "✅ გამოქვეყნებული", st_rejected: "🚫 მოხსნილი",
    site_msg: "🌐 " + SITE + "/my — თქვენი განცხადებები და საიტზე შესვლა.",
    published: (type, name) => `🎉 თქვენი ობიექტი (${type} · ${name}) გამოქვეყნდა: ${SITE}`,
  },
};
function B(lang, key) { const l = T[lang] ? lang : "ru"; return T[l][key] !== undefined ? T[l][key] : T.ru[key]; }

// детекторы, не зависящие от языка
const isBack = (t) => t.startsWith("⬅️") || t === "/back";
const isCancel = (t) => t.includes("✖️") || t === "/cancel" || t === "/отмена";
const isSkip = (t) => { const low = t.toLowerCase(); return ["пропустить", "skip", "გამოტოვება", "/skip", "-", "нет"].includes(low); };
const isDoneAmen = (t) => t.startsWith("✔️");
const isGeoOk = (t) => t.startsWith("✅");
const dealFromText = (t) => /прода|sale|გაყიდ/i.test(t) ? "sale" : /аренд|rent|ქირ/i.test(t) ? "rent" : /посут|daily|დღიურ/i.test(t) ? "daily" : null;

// Цена/телефон/гео-хелперы
function normPrice(raw) {
  let s = (raw || "").trim();
  if (!s) return "—";
  s = s.replace(/\d{4,}/, (m) => m.replace(/\B(?=(\d{3})+(?!\d))/g, " "));
  const hasCur = /[$₾€]|usd|gel|lari|лар|евро|eur/i.test(s);
  if (!hasCur) s = "$" + s;
  s = s.replace(/\$\s*\$+/g, "$");
  return s;
}
function gePhone(raw) {
  const s = String(raw || "").replace(/[^\d]/g, "");
  if (s.startsWith("995") && s.length === 12) return "+" + s;
  if (s.length === 9) return "+995" + s;
  return null;
}
const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
function cleanTg(raw) {
  const m = String(raw || "").trim().match(/(?:t\.me\/|@)?([A-Za-z0-9_]{3,})/);
  return m ? m[1].replace(/[^A-Za-z0-9_]/g, "") : "";
}
async function geocode(q) {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${key}&limit=1&country=ge`);
    const j = await r.json();
    const c = j?.features?.[0]?.center;
    if (Array.isArray(c) && c.length === 2) return { lat: c[1], lng: c[0] };
  } catch (e) { console.error("geocode error:", e?.message); }
  return null;
}

// ---- Telegram helpers ----
async function tg(method, body) {
  const r = await fetch(`${API}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
function send(chat_id, text, keyboard) {
  const body = { chat_id, text, parse_mode: "HTML" };
  if (keyboard) body.reply_markup = { keyboard: keyboard.map((r) => r.map((t) => ({ text: t }))), resize_keyboard: true, one_time_keyboard: true };
  else body.reply_markup = { remove_keyboard: true };
  return tg("sendMessage", body);
}
function sendContact(chat, lang) {
  return tg("sendMessage", { chat_id: chat, text: B(lang, "q_contact"), reply_markup: { keyboard: [[{ text: B(lang, "contact_share"), request_contact: true }], [{ text: B(lang, "back") }, { text: B(lang, "cancel") }]], resize_keyboard: true, one_time_keyboard: true } });
}
function modButtons(status, id) {
  const tools = [{ text: "📍 Исправить гео", callback_data: `eg:${id}` }, { text: "✏️ Редактировать текст", callback_data: `et:${id}` }];
  if (status === "approved") return { inline_keyboard: [[{ text: "🗑 Снять с публикации", callback_data: `un:${id}` }], tools] };
  if (status === "rejected") return { inline_keyboard: [[{ text: "↩️ Опубликовать", callback_data: `ap:${id}` }], tools] };
  return { inline_keyboard: [[{ text: "✅ Опубликовать", callback_data: `ap:${id}` }, { text: "❌ Отклонить", callback_data: `rj:${id}` }], tools] };
}

// ---- состояние диалога ----
async function getDraft(uid) {
  const { data } = await supa.from("drafts").select("*").eq("tg_user_id", uid).maybeSingle();
  return data || { tg_user_id: uid, step: null, data: {} };
}
async function saveDraft(uid, step, data) {
  await supa.from("drafts").upsert({ tg_user_id: uid, step, data, updated_at: new Date().toISOString() });
}
async function clearDraft(uid) { await supa.from("drafts").delete().eq("tg_user_id", uid); }
async function getUserLang(uid) {
  try { const { data } = await supa.from("users").select("lang").eq("tg_user_id", uid).maybeSingle(); return (data && data.lang) || "ru"; } catch (e) { return "ru"; }
}

// ---- загрузка фото ----
async function uploadPhoto(fileId) {
  const f = await tg("getFile", { file_id: fileId });
  const path = f?.result?.file_path;
  if (!path) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${path}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const buf = await watermarkBuffer(raw, { maxDim: 1600, targetKB: 200 }); // знак + сжатие, как в форме
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const up = await supa.storage.from("listing-photos").upload(name, buf, { contentType: "image/jpeg", upsert: false });
  if (up.error) return null;
  return supa.storage.from("listing-photos").getPublicUrl(name).data.publicUrl;
}

const STEP_ORDER = ["lang", "country", "city", "deal", "type", "complex", "address", "geo", "price", "currency", "area", "rooms", "bathrooms", "floor", "year", "about", "amenities", "no_commission", "photos", "facade", "contact", "tg"];

function mainMenu(lang) { return [[B(lang, "btn_add")], [B(lang, "btn_my"), B(lang, "btn_site")]]; }
function showMenu(chat, lang, greetKey) { return send(chat, B(lang, greetKey || "menu_title"), mainMenu(lang)); }
async function showMyListings(chat, uid, lang) {
  const STAT = { pending: B(lang, "st_pending"), approved: B(lang, "st_approved"), rejected: B(lang, "st_rejected") };
  const { data } = await supa.from("listings").select("*").eq("tg_user_id", uid).order("created_at", { ascending: false });
  if (!data || !data.length) return send(chat, B(lang, "my_empty"), mainMenu(lang));
  const lines = data.slice(0, 20).map((r, i) => `${i + 1}. ${DEAL_RU[r.deal] || r.deal} · ${r.type} · ${r.price} — ${STAT[r.status] || r.status}`).join("\n");
  return send(chat, B(lang, "my_title") + "\n\n" + lines + "\n\n" + B(lang, "my_tail") + SITE + "/my", mainMenu(lang));
}

const chunk2 = (arr) => { const r = []; for (let i = 0; i < arr.length; i += 2) r.push(arr.slice(i, i + 2)); return r; };

function langKeyboard() { return [["🇬🇪 ქართული"], ["🇷🇺 Русский"], ["🇬🇧 English"]]; }
function langFromText(t) { return /ქართ|🇬🇪/i.test(t) ? "ka" : /engl|🇬🇧/i.test(t) ? "en" : /рус|🇷🇺/i.test(t) ? "ru" : null; }

// Универсальный вопрос шага с клавиатурой на нужном языке
async function ask(chat, step, lang) {
  const nav = [B(lang, "back"), B(lang, "cancel")];
  if (step === "lang") return send(chat, B(lang, "q_lang"), langKeyboard());
  let kb = [];
  if (step === "country") kb = [[B(lang, "kb_georgia")]];
  else if (step === "city") kb = chunk2(CITIES_L[lang]);
  else if (step === "deal") kb = [[B(lang, "deal_sale"), B(lang, "deal_rent"), B(lang, "deal_daily")]];
  else if (step === "type") kb = chunk2(TYPES_L[lang]);
  else if (step === "complex" || step === "bathrooms" || step === "year" || step === "tg" || step === "facade") kb = [[B(lang, "skip")]];
  else if (step === "currency") kb = [[B(lang, "cur_usd"), B(lang, "cur_gel")]];
  else if (step === "no_commission") kb = [[B(lang, "nc_yes"), B(lang, "nc_no")]];
  const qKey = step === "no_commission" ? "q_no_commission" : "q_" + step;
  kb.push(nav);
  return send(chat, B(lang, qKey), kb);
}
async function askGeo(chat, data, lang) {
  const nav = [B(lang, "back"), B(lang, "cancel")];
  if (data.geo_auto && data.lat) {
    await tg("sendLocation", { chat_id: chat, latitude: data.lat, longitude: data.lng });
    return send(chat, B(lang, "geo_auto")(esc(data.address || "")), [[B(lang, "geo_ok")], nav]);
  }
  return send(chat, B(lang, "q_geo"), [nav]);
}
async function askAmenities(chat, data, lang) {
  const sel = data.amenities || []; // канон
  const labels = AMEN_L[lang];
  const rows = [];
  for (let i = 0; i < AMEN_C.length; i += 2) {
    rows.push(AMEN_C.slice(i, i + 2).map((c, k) => {
      const label = labels[i + k];
      return sel.includes(c) ? "✅ " + label : label;
    }));
  }
  rows.push([B(lang, "amen_done"), B(lang, "skip")], [B(lang, "back"), B(lang, "cancel")]);
  const selLabels = sel.map((c) => labels[AMEN_C.indexOf(c)]).filter(Boolean);
  return send(chat, B(lang, "amen_q")(selLabels), rows);
}

// ---- Финал ----
async function finalizeListing(chat, uid, data, author) {
  const lang = data.lang || "ru";
  const city = data.city || "Батуми";
  const currency = data.currency === "GEL" ? "GEL" : "USD";
  const sym = currency === "GEL" ? "₾" : "$";
  const priceStr = data.priceNum ? sym + String(data.priceNum).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "—";
  const descCol = { ru: "desc_ru", en: "desc_en", ka: "desc_ka" }[lang];
  const row = {
    status: "pending", lang,
    building_name: cleanAddress(data.address) || (data.type ? `${data.type}, ${city}` : "Объект"),
    kind: COMPLEX_TYPES.test(data.type || "") || data.complex ? "complex" : "house",
    district: city,
    lat: data.lat || 41.645, lng: data.lng || 41.642,
    deal: data.deal, type: data.type, rooms: data.rooms || 0, area: data.area || 0,
    bathrooms: data.bathrooms || null, floor: data.floor || "—", year: data.year || null,
    complex: data.complex || "", amenities: (data.amenities || []).join(", "), no_commission: !!data.no_commission,
    price: priceStr, currency, price_num: data.priceNum || null,
    per: data.deal === "rent" ? "в месяц" : data.deal === "daily" ? "в сутки" : "",
    about: data.about || "", photos: data.photos || [], facade_photo: data.facade || null,
    tg_user_id: uid, tg_username: data.tg_username || "", contact: data.contact, phone: data.phone || "",
  };
  if (descCol) row[descCol] = data.about || "";
  row["name_" + lang] = row.building_name;
  const { data: ins, error } = await supa.from("listings").insert(row).select("id").single();
  if (uid) await supa.from("users").upsert({ tg_user_id: uid, phone: data.phone || null, username: data.tg_username || "", lang }, { onConflict: "tg_user_id" });
  await clearDraft(uid);
  if (error) return send(chat, B(lang, "save_error"));
  await send(chat, B(lang, "done_seller"));
  // Модерация — всегда на русском (для CEO)
  if (row.photos.length) await tg("sendMediaGroup", { chat_id: ADMIN, media: row.photos.slice(0, 10).map((u) => ({ type: "photo", media: u })) });
  if (data.lat) await tg("sendLocation", { chat_id: ADMIN, latitude: data.lat, longitude: data.lng });
  const geoLine = data.lat ? `\n📍 <a href="${mapsLink(data.lat, data.lng)}">проверить точку на карте</a> (откройте спутник)` : `\n⚠️ точка на карте НЕ указана`;
  const tgLine = row.tg_username ? `\n✈️ @${esc(row.tg_username)}` : "";
  const complexLine = data.complex ? `\n🏢 ЖК: ${esc(data.complex)}` : "";
  const extra = [data.bathrooms ? `🚿 ${data.bathrooms} с/у` : "", data.year ? `🏗 ${data.year}` : ""].filter(Boolean).join(" · ");
  const amenLine = (data.amenities && data.amenities.length) ? `\n🏷 ${esc(data.amenities.join(", "))}` : "";
  const ncLine = data.no_commission ? `\n✅ без комиссии` : "";
  const langLine = `\n🌐 язык: ${lang.toUpperCase()}`;
  // Блок «Связаться с автором» (отправитель в боте) — отдельно от публичного контакта на сайте.
  const au = author || {};
  const auName = au.name || au.username || (au.id != null ? String(au.id) : "");
  const authorRows = [];
  let authorLine = "";
  if (au.username) {
    authorRows.push([{ text: "💬 Связаться с автором", url: `https://t.me/${au.username}` }]);
    authorLine = `\n👤 Автор: ${esc(auName)} (@${esc(au.username)})`;
  } else if (au.id != null) {
    authorLine = `\n👤 Автор: ${esc(auName)} (Telegram id ${esc(au.id)})`;
  }
  const summary = `🆕 <b>Новое объявление</b>${langLine}\n${DEAL_RU[row.deal]} · ${row.type}\n🏙 ${esc(city)}${complexLine}\n🏠 ${esc(row.building_name)}\n💰 ${row.price}\n📐 ${row.area} м² · 🛏 ${row.rooms} комн. · 🏢 ${esc(row.floor)}${extra ? "\n" + extra : ""}\n📷 ${row.photos.length} фото${geoLine}${amenLine}${ncLine}\n📞 ${row.contact}${data.verified ? " ✅ подтверждён" : ""}${tgLine}${authorLine}\n\n${esc(row.about)}`;
  const kb = modButtons("pending", ins.id);
  if (authorRows.length) kb.inline_keyboard = [...kb.inline_keyboard, ...authorRows];
  await tg("sendMessage", { chat_id: ADMIN, text: summary, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: kb });
}

async function onMessage(msg) {
  const chat = msg.chat.id;
  const uid = msg.from.id;
  const text = (msg.text || "").trim();

  if (text.startsWith("/start login_")) {
    const ltoken = text.slice("/start login_".length).trim();
    if (ltoken) await supa.from("login_tokens").update({ tg_user_id: uid, name: msg.from.first_name || "", username: msg.from.username || "" }).eq("token", ltoken);
    const ul = await getUserLang(uid);
    return send(chat, ul === "ka" ? "✅ მზადაა! დაბრუნდით საიტზე — შესვლა შესრულდა." : ul === "en" ? "✅ Done! Return to the site — you're logged in." : "✅ Готово! Вернитесь на сайт — вход выполнен.", mainMenu(ul));
  }
  if (text === "/start" || text === "/menu") { await clearDraft(uid); const ul = await getUserLang(uid); return showMenu(chat, ul, "menu_greet"); }

  // Команда добавления — запускаем с выбора языка
  if (text === "/add" || text === "/добавить" || /➕/.test(text)) {
    await saveDraft(uid, "lang", { tg_user_id: uid, tg_username: msg.from.username || "" });
    return ask(chat, "lang", "ru");
  }
  if (text === "/my" || /📋/.test(text)) { const ul = await getUserLang(uid); return showMyListings(chat, uid, ul); }
  if (/🌐/.test(text) || text === "/site") { const ul = await getUserLang(uid); return send(chat, B(ul, "site_msg"), mainMenu(ul)); }

  const d = await getDraft(uid);
  if (!d.step) { const ul = await getUserLang(uid); return showMenu(chat, ul, "menu_choose"); }
  const data = d.data || {};
  const lang = data.lang || "ru";

  if (isCancel(text) || text === "/cancel") { await clearDraft(uid); const ul = data.lang || (await getUserLang(uid)); return showMenu(chat, ul, "cancelled"); }

  // Модератор исправляет геопозицию
  if (d.step === "modgeo") {
    if (msg.location) {
      await supa.from("listings").update({ lat: msg.location.latitude, lng: msg.location.longitude }).eq("id", data.editId);
      await clearDraft(uid);
      return send(chat, `✅ Геопозиция объекта обновлена.\n📍 ${mapsLink(msg.location.latitude, msg.location.longitude)}\nНа сайте обновится в течение нескольких минут.`, mainMenu("ru"));
    }
    return send(chat, "Пришлите новую точку на карте: 📎 → Геопозиция → «Выбрать на карте» (лучше в режиме «Спутник»). Или /cancel.");
  }

  // Модератор редактирует текст описания
  if (d.step === "modtext") {
    if (!text || text.startsWith("/")) return send(chat, "Пришлите новый текст описания (обычным сообщением). Или /cancel чтобы отменить.");
    const { data: lst } = await supa.from("listings").select("lang, status, tg_post_id").eq("id", data.editId).maybeSingle();
    const llang = (lst && lst.lang) || "ru";
    const descCol = { ru: "desc_ru", en: "desc_en", ka: "desc_ka" }[llang] || "desc_ru";
    // about + desc_<язык объявления> = новый текст; остальные desc-поля обнуляем,
    // чтобы при одобрении (ap) translateDescriptions перевёл их заново.
    const upd = { about: text, [descCol]: text };
    for (const c of ["desc_ru", "desc_en", "desc_ka"]) if (c !== descCol) upd[c] = null;
    await supa.from("listings").update(upd).eq("id", data.editId);
    await clearDraft(uid);
    // Опубликованный пост в канале не переписываем — только запись в БД.
    const channelNote = (lst && lst.status === "approved" && lst.tg_post_id) ? "\nℹ️ В канале текст не меняется — обновлено на сайте/в БД." : "";
    return send(chat, "✅ Текст обновлён." + channelNote, mainMenu("ru"));
  }

  if (isBack(text)) {
    const idx = STEP_ORDER.indexOf(d.step);
    if (idx <= 0) { await clearDraft(uid); return showMenu(chat, lang, "menu_title"); }
    const prev = STEP_ORDER[idx - 1];
    await saveDraft(uid, prev, data);
    return prev === "contact" ? sendContact(chat, lang) : prev === "geo" ? askGeo(chat, data, lang) : prev === "amenities" ? askAmenities(chat, data, lang) : ask(chat, prev, lang);
  }

  switch (d.step) {
    case "lang": {
      const chosen = langFromText(text);
      if (!chosen) return ask(chat, "lang", "ru");
      data.lang = chosen; await saveDraft(uid, "country", data);
      await supa.from("users").upsert({ tg_user_id: uid, lang: chosen }, { onConflict: "tg_user_id" });
      return ask(chat, "country", chosen);
    }
    case "country": {
      if (!/груз|georgia|საქართ|🇬🇪/i.test(text)) return send(chat, B(lang, "country_only_ge"), [[B(lang, "kb_georgia")], [B(lang, "back"), B(lang, "cancel")]]);
      data.country = "Грузия"; await saveDraft(uid, "city", data); return ask(chat, "city", lang);
    }
    case "city": {
      const c = canon(CITIES_L, CITIES_C, text.replace(/^🇬🇪\s*/, "").trim());
      data.city = c || text.replace(/^🇬🇪\s*/, "").trim() || "Батуми";
      await saveDraft(uid, "deal", data); return ask(chat, "deal", lang);
    }
    case "deal": {
      const deal = dealFromText(text);
      if (!deal) return ask(chat, "deal", lang);
      data.deal = deal; await saveDraft(uid, "type", data); return ask(chat, "type", lang);
    }
    case "type": {
      const c = canon(TYPES_L, TYPES_C, text);
      data.type = c || text; await saveDraft(uid, "complex", data); return ask(chat, "complex", lang);
    }
    case "complex": {
      if (!isSkip(text)) data.complex = text.trim();
      await saveDraft(uid, "address", data); return ask(chat, "address", lang);
    }
    case "address": {
      data.address = text;
      const g = await geocode(`${text}, ${data.city || "Батуми"}, Georgia`);
      if (g) { data.lat = g.lat; data.lng = g.lng; data.geo_auto = true; }
      await saveDraft(uid, "geo", data);
      return askGeo(chat, data, lang);
    }
    case "geo": {
      if (msg.location) { data.lat = msg.location.latitude; data.lng = msg.location.longitude; data.geo_auto = false; }
      await saveDraft(uid, "price", data); return ask(chat, "price", lang);
    }
    case "price": { data.priceNum = parseInt(String(text).replace(/[^\d]/g, ""), 10) || null; await saveDraft(uid, "currency", data); return ask(chat, "currency", lang); }
    case "currency": { data.currency = /gel|₾|лар/i.test(text) ? "GEL" : "USD"; await saveDraft(uid, "area", data); return ask(chat, "area", lang); }
    case "area": { data.area = parseInt(text, 10) || 0; await saveDraft(uid, "rooms", data); return ask(chat, "rooms", lang); }
    case "rooms": { data.rooms = parseInt(text, 10) || 0; await saveDraft(uid, "bathrooms", data); return ask(chat, "bathrooms", lang); }
    case "bathrooms": { if (!isSkip(text)) data.bathrooms = parseInt(text, 10) || null; await saveDraft(uid, "floor", data); return ask(chat, "floor", lang); }
    case "floor": { data.floor = text; await saveDraft(uid, "year", data); return ask(chat, "year", lang); }
    case "year": { if (!isSkip(text)) data.year = parseInt(text, 10) || null; await saveDraft(uid, "about", data); return ask(chat, "about", lang); }
    case "about": { data.about = text; await saveDraft(uid, "amenities", data); return askAmenities(chat, data, lang); }
    case "amenities": {
      if (isDoneAmen(text)) { await saveDraft(uid, "no_commission", data); return ask(chat, "no_commission", lang); }
      if (isSkip(text)) { data.amenities = []; await saveDraft(uid, "no_commission", data); return ask(chat, "no_commission", lang); }
      const label = text.replace(/^✅\s*/, "").trim();
      const c = canon(AMEN_L, AMEN_C, label);
      if (c) {
        const sel = data.amenities || [];
        data.amenities = sel.includes(c) ? sel.filter((x) => x !== c) : [...sel, c];
        await saveDraft(uid, "amenities", data);
      }
      return askAmenities(chat, data, lang);
    }
    case "no_commission": { data.no_commission = isGeoOk(text); data.photos = data.photos || []; await saveDraft(uid, "photos", data); return ask(chat, "photos", lang); }
    case "photos": {
      if (msg.photo && msg.photo.length) {
        const url = await uploadPhoto(msg.photo[msg.photo.length - 1].file_id);
        if (url) { data.photos = (data.photos || []).concat(url); await saveDraft(uid, "photos", data); return send(chat, B(lang, "photo_added")(data.photos.length)); }
        return send(chat, B(lang, "photo_fail"));
      }
      if (text === "/done" || text === "/готово") { await saveDraft(uid, "facade", data); return ask(chat, "facade", lang); }
      return send(chat, B(lang, "photo_need"));
    }
    case "facade": {
      if (msg.photo && msg.photo.length) {
        const url = await uploadPhoto(msg.photo[msg.photo.length - 1].file_id);
        if (url) { data.facade = url; await saveDraft(uid, "contact", data); await send(chat, B(lang, "facade_added")); return sendContact(chat, lang); }
        return send(chat, B(lang, "photo_fail"));
      }
      // «Пропустить» или любой текст — фасад необязателен, идём дальше
      await saveDraft(uid, "contact", data);
      return sendContact(chat, lang);
    }
    case "contact": {
      const phone = gePhone(msg.contact && msg.contact.phone_number ? msg.contact.phone_number : text);
      if (!phone) { await send(chat, B(lang, "contact_bad")); return sendContact(chat, lang); }
      data.phone = phone; data.contact = phone;
      data.verified = !!(msg.contact && msg.contact.phone_number);
      await saveDraft(uid, "tg", data);
      return ask(chat, "tg", lang);
    }
    case "tg": {
      if (!isSkip(text)) { const t = cleanTg(text); if (t) data.tg_username = t; }
      return finalizeListing(chat, uid, data, { id: uid, username: msg.from.username || "", name: msg.from.first_name || "" });
    }
    default: return send(chat, "/start");
  }
}

function unitLink(row) {
  const uslug = slugify(`${row.building_name || "obj"}-${row.type || ""}-${row.price || ""}`);
  return `${SITE}/property/${uslug}`;
}
async function postToChannel(row, channel) {
  if (!channel) return [];
  const per = row.per ? " " + row.per : "";
  const bits = [`📐 ${row.area || 0} м²`];
  if (row.rooms) bits.push(`🛏 ${row.rooms} комн.`);
  if (row.floor && row.floor !== "—") bits.push(`🏢 этаж ${esc(row.floor)}`);
  const about = (row.about || "").trim();
  const aboutShort = about.length > 380 ? about.slice(0, 380).trim() + "…" : about;
  const tag = (s) => "#" + String(s || "").replace(/[^\p{L}\p{N}]/gu, "");
  const tags = [tag(row.district), tag(DEAL_RU[row.deal])].filter((t) => t.length > 1).join(" ");
  const cap =
    `🆕 <b>${DEAL_RU[row.deal] || row.deal} · ${esc(row.type)}</b>\n` +
    `📍 ${esc(row.building_name)}\n` +
    `💰 <b>${esc(row.price)}${per}</b>\n` +
    `${bits.join(" · ")}\n` +
    `📞 ${esc(row.contact || "по запросу")}\n` +
    `✈️ @${esc(row.tg_username || "bayluxhome")}\n` +
    (aboutShort ? `\n${esc(aboutShort)}\n` : "") +
    `\n🔗 <a href="${unitLink(row)}">Открыть на сайте Baylux</a>` +
    (tags ? `\n\n${tags}` : "");
  const photos = Array.isArray(row.photos) ? row.photos.slice(0, 10) : [];
  try {
    if (photos.length) {
      const media = photos.map((u, i) => (i === 0 ? { type: "photo", media: u, caption: cap, parse_mode: "HTML" } : { type: "photo", media: u }));
      const res = await tg("sendMediaGroup", { chat_id: channel, media });
      return (res?.result || []).map((m) => m.message_id);
    }
    const res = await tg("sendMessage", { chat_id: channel, text: cap, parse_mode: "HTML" });
    return res?.result?.message_id ? [res.result.message_id] : [];
  } catch (e) { console.error("channel post error:", e?.message); return []; }
}

async function onCallback(cb) {
  const [action, id] = (cb.data || "").split(":");
  if (!id) return;

  // ---- Модерация ПАЧКИ (массовая загрузка): одна кнопка на все объекты batch_id ----
  if (action === "bap" || action === "brj") {
    const bstatus = action === "bap" ? "approved" : "rejected";
    const { data: list } = await supa.from("listings").select("*").eq("batch_id", id);
    const rows = list || [];
    await supa.from("listings").update({ status: bstatus }).eq("batch_id", id);
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: bstatus === "approved" ? `Одобрено: ${rows.length}` : `Отклонено: ${rows.length}` });

    let posted = 0;
    for (const row of rows) {
      if (action === "bap") {
        try {
          const upd = {};
          if (row.about && (!row.desc_ru || !row.desc_en || !row.desc_ka)) Object.assign(upd, await translateDescriptions(row.about, row.lang || "ru"));
          if (row.building_name && (!row.name_ru || !row.name_en || !row.name_ka)) Object.assign(upd, await translateNames(row.building_name, row.lang || "ru"));
          if (Object.keys(upd).length) { await supa.from("listings").update(upd).eq("id", row.id); Object.assign(row, upd); }
        } catch (e) { console.error("batch translate:", e?.message); }
        if ((CH_BATUMI || CH_TBILISI) && !row.tg_post_id) {
          const ch = pickChannel(row);
          const ids = await postToChannel(row, ch);
          if (ids.length) { await supa.from("listings").update({ tg_post_id: ids.join(","), tg_channel: ch }).eq("id", row.id); posted++; }
        }
      } else if (row.tg_post_id) {
        const ch = row.tg_channel || CH_BATUMI;
        for (const mid of String(row.tg_post_id).split(",")) await tg("deleteMessage", { chat_id: ch, message_id: Number(mid) });
        await supa.from("listings").update({ tg_post_id: null }).eq("id", row.id);
      }
    }
    const btag = bstatus === "approved" ? `✅ ОДОБРЕНА ПАЧКА (${rows.length}, в каналы: ${posted})` : `❌ ПАЧКА ОТКЛОНЕНА (${rows.length})`;
    const bbase = (cb.message.text || "").replace(/\n\n(✅ ОДОБРЕНА ПАЧКА|❌ ПАЧКА ОТКЛОНЕНА).*$/s, "");
    await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: bbase + `\n\n${btag}`, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: [] } });
    return;
  }

  if (action === "eg") {
    await saveDraft(cb.from.id, "modgeo", { editId: id });
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Пришлите новую точку на карте" });
    await tg("sendMessage", { chat_id: cb.message.chat.id, text: `📍 Исправление геопозиции объекта.\nПришлите новую точку: 📎 → Геопозиция → «Выбрать на карте» (лучше в режиме «Спутник»).\nИли /cancel чтобы отменить.` });
    return;
  }

  if (action === "et") {
    await saveDraft(cb.from.id, "modtext", { editId: id });
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Пришлите новый текст описания" });
    await tg("sendMessage", { chat_id: cb.message.chat.id, text: `✏️ Пришлите новый текст описания. Или /cancel чтобы отменить.` });
    return;
  }

  // Модерация профиля риелтора
  if (action === "rap" || action === "rrj") {
    const rstatus = action === "rap" ? "approved" : "rejected";
    const { data: rr } = await supa.from("realtors").update({ status: rstatus }).eq("id", id).select("*").single();
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: rstatus === "approved" ? "Риелтор одобрен" : "Отклонён" });
    const rtag = rstatus === "approved" ? "✅ ОДОБРЕН" : "❌ ОТКЛОНЁН";
    if (cb.message.caption != null) {
      const base = cb.message.caption.replace(/\n\n(✅ ОДОБРЕН|❌ ОТКЛОНЁН).*$/s, "");
      await tg("editMessageCaption", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, caption: base + `\n\n${rtag}`, parse_mode: "HTML" });
    } else {
      const base = (cb.message.text || "").replace(/\n\n(✅ ОДОБРЕН|❌ ОТКЛОНЁН).*$/s, "");
      await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: base + `\n\n${rtag}`, parse_mode: "HTML" });
    }
    if (rr && rr.tg_user_id && rstatus === "approved") {
      await tg("sendMessage", { chat_id: rr.tg_user_id, text: "🎉 Ваш профиль риелтора одобрен и опубликован на сайте Baylux." });
    }
    return;
  }

  const status = action === "ap" ? "approved" : "rejected";
  const { data: row } = await supa.from("listings").update({ status }).eq("id", id).select("*").single();
  await tg("answerCallbackQuery", { callback_query_id: cb.id, text: status === "approved" ? "Опубликовано" : "Снято с публикации" });

  // Автоперевод при одобрении (если ключ Google задан): описание + адрес (улица). ЖК не переводим.
  if (row && action === "ap") {
    try {
      const upd = {};
      if (row.about && (!row.desc_ru || !row.desc_en || !row.desc_ka)) Object.assign(upd, await translateDescriptions(row.about, row.lang || "ru"));
      if (row.building_name && (!row.name_ru || !row.name_en || !row.name_ka)) Object.assign(upd, await translateNames(row.building_name, row.lang || "ru"));
      if (Object.keys(upd).length) { await supa.from("listings").update(upd).eq("id", id); Object.assign(row, upd); }
    } catch (e) { console.error("translate on approve:", e?.message); }
  }

  if (row && (CH_BATUMI || CH_TBILISI)) {
    if (action === "ap" && !row.tg_post_id) {
      const ch = pickChannel(row);
      const ids = await postToChannel(row, ch);
      if (ids.length) await supa.from("listings").update({ tg_post_id: ids.join(","), tg_channel: ch }).eq("id", id);
    } else if (action !== "ap" && row.tg_post_id) {
      const ch = row.tg_channel || CH_BATUMI;
      for (const mid of String(row.tg_post_id).split(",")) await tg("deleteMessage", { chat_id: ch, message_id: Number(mid) });
      await supa.from("listings").update({ tg_post_id: null }).eq("id", id);
    }
  }
  const tag = status === "approved" ? "✅ ОПУБЛИКОВАНО" : "❌ СНЯТО С ПУБЛИКАЦИИ";
  const base = (cb.message.text || "").replace(/\n\n(✅ ОПУБЛИКОВАНО|❌ СНЯТО С ПУБЛИКАЦИИ).*$/s, "");
  await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: base + `\n\n${tag}`, parse_mode: "HTML", reply_markup: modButtons(status, id) });
  if (row && row.tg_user_id && action === "ap") {
    const ul = row.lang || "ru";
    await tg("sendMessage", { chat_id: row.tg_user_id, text: B(ul, "published")(row.type, row.building_name) });
  }
}

export async function GET(req) {
  if (new URL(req.url).searchParams.get("setup") === "1") {
    const r = await tg("setWebhook", { url: `${SITE}/api/tg`, secret_token: SECRET, allowed_updates: ["message", "callback_query"] });
    await tg("setMyCommands", { commands: [
      { command: "start", description: "🏠 Меню / Menu / მენიუ" },
      { command: "add", description: "➕ Добавить / Add / დამატება" },
      { command: "my", description: "📋 Мои / My / ჩემი" },
      { command: "cancel", description: "Отмена / Cancel / გაუქმება" },
    ] });
    await tg("setChatMenuButton", { menu_button: { type: "commands" } });
    return Response.json(r);
  }
  return Response.json({ ok: true, bot: "baylux" });
}

export async function POST(req) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) return new Response("forbidden", { status: 403 });
  if (!supa) return Response.json({ ok: true });
  let update;
  try { update = await req.json(); } catch { return Response.json({ ok: true }); }
  try {
    if (update.message) await onMessage(update.message);
    else if (update.callback_query) await onCallback(update.callback_query);
  } catch (e) { console.error("tg error:", e?.message); }
  return Response.json({ ok: true });
}
