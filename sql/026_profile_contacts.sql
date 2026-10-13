-- 13.10.2026: контакты профиля для автозаполнения объявлений.
-- Телефон уже есть в site_users.phone (используем его как единый источник).
-- Добавляем только Telegram для связи (username без «@»). Повторный запуск безопасен.
alter table site_users add column if not exists contact_tg text;

-- Перенос уже известных телефонов риелторов в профиль, если в профиле пусто (без перезаписи).
update site_users su set phone = r.phone
from realtors r
where su.phone is null and r.phone is not null and r.phone <> ''
  and ((su.tg_user_id is not null and su.tg_user_id = r.tg_user_id) or (su.email is not null and lower(su.email) = lower(r.email)));

-- Телефоны из бота (таблица users, по Telegram id), если в профиле пусто.
update site_users su set phone = u.phone
from users u
where su.phone is null and u.phone is not null and u.phone <> '' and su.tg_user_id = u.tg_user_id;
