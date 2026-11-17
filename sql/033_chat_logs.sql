-- Журнал чата-подборщика (T-20261118-02).
-- Персональные данные маскируются в коде ДО записи (телефон/e-mail/@ник → [phone]/[email]/[tg]);
-- IP хранится только как короткий солёный хэш (для разбора злоупотреблений).
-- Без таблицы чат работает, журнал просто пропускается. Выполнить в Supabase SQL Editor.
create table if not exists chat_logs (
  id bigserial primary key,
  conversation_id text not null,
  ip_hash text,
  lang text,
  user_text text,
  reply text,
  tools jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists chat_logs_conv_idx on chat_logs (conversation_id, created_at);
create index if not exists chat_logs_created_idx on chat_logs (created_at);
alter table chat_logs enable row level security; -- только сервер (service_role)
