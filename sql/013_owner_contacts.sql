-- Контакты реального владельца квартиры (вносит ответственный сотрудник или админ).
-- Отдельно от owner_email/tg_user_id (привязка к аккаунту) — владелец может быть не зарегистрирован.
alter table listings add column if not exists owner_name text;
alter table listings add column if not exists owner_phone text;
