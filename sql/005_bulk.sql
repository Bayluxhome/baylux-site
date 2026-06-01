-- 005_bulk.sql — массовая загрузка объявлений риелторами.
-- Пачка объявлений объединяется общим batch_id; модерация — одной кнопкой на всю пачку.
alter table listings add column if not exists batch_id text;
-- geo_ok = false, если адрес не удалось геокодировать (поставлены координаты центра города).
alter table listings add column if not exists geo_ok boolean not null default true;
create index if not exists idx_listings_batch on listings (batch_id);
