// Единый реестр прав. Добавляешь новую систему — дописываешь сюда одну строку,
// и галочка автоматически появляется в разделе «Сотрудники», а страница защищается can(session, "ключ").
export const PERMISSIONS = [
  { key: "moderate", label: "Модерация объявлений" },
  { key: "managed", label: "Объекты в управлении" },
  { key: "news", label: "Новости" },
  { key: "realtors", label: "Риелторы" },
  { key: "users", label: "Пользователи" },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);
