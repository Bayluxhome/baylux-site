-- Ответственный сотрудник за объект под управлением (заполняет выручку, договоры и т.д.).
-- Назначается админом. Матчим по email или Telegram-id (как владельца).
alter table listings add column if not exists responsible_email text;
alter table listings add column if not exists responsible_tg bigint;
create index if not exists listings_responsible_idx on listings (responsible_tg, responsible_email);
