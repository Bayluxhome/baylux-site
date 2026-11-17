-- T-20261118-04 (18.11.2026): журнал серверной автомодерации (/api/cron/auto-moderation).
-- Выполнить в Supabase SQL Editor. Без таблицы cron работает по окну времени (проверяет только свежие pending),
-- но повторные проверки и отчёт за сутки возможны только с таблицей.
create table if not exists auto_mod_log (
  id bigserial primary key,
  listing_id bigint not null,
  mode text not null,                 -- shadow | on
  decision text not null,             -- publish (on) | would_publish (shadow) | disputed
  reasons text[] not null default '{}',
  ai jsonb,
  created_at timestamptz not null default now()
);
create index if not exists auto_mod_log_listing_idx on auto_mod_log (listing_id);
create index if not exists auto_mod_log_created_idx on auto_mod_log (created_at);
alter table auto_mod_log enable row level security;  -- доступ только сервисному ключу
