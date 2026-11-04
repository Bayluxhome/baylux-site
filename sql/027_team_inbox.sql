-- 04.11.2026: «Baylux Показы» — связь агента с командой (Дмитрий, Татьяна, позже риелторы).
-- Агент шлёт карточку в TG-группу через бота (team_cards). Команда отвечает reply на карточку —
-- вебхук бота кладёт ответ в team_replies. Агент забирает необработанные ответы одной выборкой
-- и пишет клиенту. Повторный запуск безопасен.
create table if not exists team_cards (
  id bigserial primary key,
  chat_id bigint not null,
  message_id bigint not null,
  ref text,                 -- ссылка на лид/клиента: «ig:alex_alexeenko», «lead:123» и т.п.
  text text not null,
  created_at timestamptz not null default now(),
  unique (chat_id, message_id)
);

create table if not exists team_replies (
  id bigserial primary key,
  chat_id bigint not null,
  message_id bigint not null,
  card_id bigint references team_cards(id) on delete set null,
  reply_to_message_id bigint,
  from_id bigint,
  from_name text,
  from_username text,
  text text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (chat_id, message_id)
);
create index if not exists team_replies_unprocessed_idx on team_replies (created_at) where processed_at is null;

-- Доступ только серверу (service_role). Анонимному ключу таблицы закрыты.
alter table team_cards enable row level security;
alter table team_replies enable row level security;
