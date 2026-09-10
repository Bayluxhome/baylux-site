-- Кабинет риелтора, этап 1 (задача №06): клиенты и заметки.
--
-- Клиент принадлежит риелтору (owner_email / owner_tg — как объявления, заявки, подборки).
-- Сотрудник с правом «Заявки клиентов» (leads) видит всех — то же правило, что для обращений.
-- Ответственный по умолчанию = владелец; сменить может только тот, кто видит всех.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  owner_email text,
  owner_tg bigint,
  name text not null,
  phone text,                       -- цифры с кодом страны
  tg text,                          -- username без @
  email text,
  source text,                      -- откуда пришёл: site / telegram / whatsapp / referral / other
  lang text,                        -- предпочтительный язык: ru / en / ka
  req_city text,                    -- требования к недвижимости
  req_deal text,                    -- sale / rent / daily
  req_type text,
  req_budget_min numeric,
  req_budget_max numeric,
  req_currency text default 'USD',
  req_notes text,
  next_action text,                 -- следующее действие (текст)
  next_action_at timestamptz,       -- когда
  stage text not null default 'new',-- new / contact / selection / viewing / negotiation / deposit / contract / won / lost
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_owner_email_idx on clients (lower(owner_email));
create index if not exists clients_owner_tg_idx on clients (owner_tg);
create index if not exists clients_phone_idx on clients (phone);

-- Заметки риелтора по клиенту (ручные записи; автоматической истории звонков/переписки нет —
-- источника таких данных в системе нет, и мы это явно не имитируем).
create table if not exists client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  body text not null,
  author text,                      -- email или tg:id того, кто записал
  created_at timestamptz not null default now()
);
create index if not exists client_notes_client_idx on client_notes (client_id, created_at desc);

-- Связи: подборки и заявки могут ссылаться на клиента.
alter table collections add column if not exists client_id uuid;
alter table leads add column if not exists client_id uuid;

alter table clients enable row level security;
alter table client_notes enable row level security;
