-- Единый учёт всех зарегистрированных пользователей (вход по email и по Telegram).
-- Запись/обновление происходит при каждом входе. tg_user_id и email — уникальны (NULL допускается).
create table if not exists site_users (
  id uuid primary key default gen_random_uuid(),
  tg_user_id bigint unique,
  email text unique,
  name text,
  username text,
  phone text,
  created_at timestamptz default now(),
  last_login timestamptz default now()
);

create index if not exists site_users_created_idx on site_users (created_at desc);
