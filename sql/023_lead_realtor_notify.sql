-- Заявка «Забронировать просмотр»: отдельный статус личного уведомления риелтору объекта.
-- Общий чат менеджеров и риелтор — независимые получатели с независимым учётом доставки.
--   sent / failed / skipped_no_realtor (объект служебного аккаунта парсера, риелтора нет) /
--   skipped_no_telegram_chat (у риелтора нет Telegram-id ни в профиле, ни в аккаунте).
alter table leads add column if not exists realtor_notify_status text;
alter table leads add column if not exists realtor_notify_at timestamptz;
alter table leads add column if not exists realtor_notify_error text;
create index if not exists leads_realtor_failed_idx on leads (created_at) where realtor_notify_status = 'failed';
