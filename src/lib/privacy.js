// Очистка данных объявления от служебных/персональных полей перед отправкой в браузер.
//
// owner_email и tg_user_id нужны только серверу — по ним объявление связывается с карточкой
// риелтора. Контакты собственника (owner_phone/owner_name/owner_tg_username) — служебные,
// их видят только сотрудники с правами.
//
// ВАЖНО про вложенность: у объекта есть ссылка на дом (building), а у дома — массив units
// со ВСЕМИ объявлениями этого дома. Если чистить только верхний уровень, персональные поля
// всё равно уезжают в HTML внутри building.units — так и было обнаружено на проде.
//
// Модуль намеренно без импортов серверного кода — его подключают и клиентские компоненты.

const PRIVATE = ["owner_email", "tg_user_id", "owner_phone", "owner_name", "owner_tg_username", "source_ref", "source_url",
  "owner_contact_email", "contract_url", "internal_no", "responsible_email", "responsible_tg"];

function omit(obj) {
  const out = {};
  for (const k of Object.keys(obj)) if (!PRIVATE.includes(k)) out[k] = obj[k];
  return out;
}

// Дом: чистим сам объект и все вложенные объявления.
export function stripPrivateBuilding(b) {
  if (!b || typeof b !== "object") return b;
  const out = omit(b);
  if (Array.isArray(b.units)) out.units = b.units.map((u) => (u && typeof u === "object" ? omit(u) : u));
  return out;
}

// Объявление: чистим сам объект и вложенный дом вместе с его списком объявлений.
export function stripPrivate(u) {
  if (!u || typeof u !== "object") return u;
  const out = omit(u);
  if (u.building && typeof u.building === "object") out.building = stripPrivateBuilding(u.building);
  return out;
}
