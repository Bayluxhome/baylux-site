-- Подписка на подборки в Telegram из чата Hanna (T-20261118-02, дополнение 18.11).
-- Строка создаётся, когда Hanna даёт кнопку «Получать подборки в Telegram» (active = false, chat_id пуст).
-- Клиент жмёт кнопку → бот получает «/start s_<token>» → привязываем chat_id, ставим consent_at и active = true.
-- /stop в боте → active = false по всем подпискам этого chat_id.
-- Без таблицы чат работает, кнопка подписки просто не показывается. Выполнить в Supabase SQL Editor.
create table if not exists chat_subscriptions (
  id bigserial primary key,
  token text not null unique,          -- s_<token> в deep link; 12 символов base64url, как у подборок
  chat_id bigint,                      -- Telegram chat_id клиента (личный чат с ботом)
  tg_username text,                    -- @ник из Telegram, если есть (Hanna его не спрашивает)
  query jsonb not null default '{}'::jsonb, -- параметры запроса: город, сделка, тип, бюджет, комнаты, район, у моря
  collection_token text,               -- подборка /c/<token>, если была создана в диалоге
  lang text not null default 'ru',     -- ru / en / ka
  consent_at timestamptz,              -- когда клиент нажал Start (согласие на подборки)
  active boolean not null default false,
  stopped_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists chat_subscriptions_chat_idx on chat_subscriptions (chat_id) where chat_id is not null;
create index if not exists chat_subscriptions_active_idx on chat_subscriptions (active) where active;
alter table chat_subscriptions enable row level security; -- только сервер (service_role)
