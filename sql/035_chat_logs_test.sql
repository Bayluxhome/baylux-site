-- Журнал чата Hanna (T-20261118-02, тест Мозга 18.11): пометка тестовых диалогов и время ответа.
-- Тестовый режим: заголовок x-hanna-test == HANNA_TEST_TOKEN (Vercel) → без лимитов, заявки не отправляются, test=true.
-- Выполнить в Supabase SQL Editor ПОСЛЕ 033_chat_logs.sql. Без этих колонок журнал пишется как раньше.
alter table chat_logs add column if not exists test boolean not null default false;
alter table chat_logs add column if not exists ms integer;
create index if not exists chat_logs_test_idx on chat_logs (test, created_at);
