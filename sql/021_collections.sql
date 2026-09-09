-- Подборки объектов для клиентов (задача №07, панель выбора — №06).
--
-- Риелтор собирает объекты под конкретного клиента и делится одной ссылкой /c/<token>.
-- Хранится в базе, а не в браузере: подборка переживает перезагрузку, открывается с другого
-- устройства, а ссылка для клиента не зависит от локального избранного риелтора.
-- Клиент здесь — имя + контакт (без отдельного справочника: сделки ведутся в CRM cvt).

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,                 -- часть публичной ссылки; случайная, не угадывается
  title text not null default '',
  client_name text,
  client_phone text,                          -- только цифры с кодом страны, для wa.me
  client_tg text,                             -- username без @
  note text,                                  -- сопроводительный текст для отправки (редактируемый)
  owner_email text,                           -- владелец-риелтор (по email сессии) …
  owner_tg bigint,                            -- … или по Telegram-id — как у объявлений и заявок
  items jsonb not null default '[]'::jsonb,   -- [{id, slug, title}] — снимок, чтобы показать «снят» без потери названия
  enabled boolean not null default true,      -- выключенная ссылка отдаёт «подборка недоступна»
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collections_owner_email_idx on collections (lower(owner_email));
create index if not exists collections_owner_tg_idx on collections (owner_tg);

-- Только сервер (service_role); анонимный доступ закрыт.
alter table collections enable row level security;

-- Заявки со страницы подборки: ссылка на подборку, чтобы обращение пришло её владельцу.
alter table leads add column if not exists collection_id uuid;
