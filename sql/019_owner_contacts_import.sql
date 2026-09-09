-- Контакты собственника/риелтора из файла парсинга + связь строки файла с объявлением.
--
-- Зачем: контакт источника есть в таблице парсинга, но при импорте он отбрасывался
-- (на сайте публикуется номер агентства). Служебные поля owner_name/owner_phone уже
-- существуют (см. 013_owner_contacts.sql) — начинаем их заполнять при импорте.
-- Эти поля НЕ публикуются на сайте: их видят только админы и ответственные сотрудники.
--
-- source_ref — ID строки из файла парсинга. Раньше он никуда не сохранялся, поэтому
-- сопоставить выгрузку с объявлением было нельзя. Теперь связь однозначная.

alter table listings add column if not exists source_ref text;
-- Telegram-ник источника (если в файле есть). Тоже служебное поле, публично не выводится.
alter table listings add column if not exists owner_tg_username text;

-- Быстрый поиск при дозаливке контактов и повторных импортах.
create index if not exists listings_source_ref_idx on listings (source_ref);
create index if not exists listings_owner_phone_idx on listings (owner_phone);
