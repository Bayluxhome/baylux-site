-- 006_photo_hashes.sql — поиск дублей по одинаковым фото.
-- photo_hashes — SHA-256 (hex) оригиналов фото объявления; пересечение массивов = дубль.
alter table listings add column if not exists photo_hashes text[] default '{}';
-- GIN-индекс ускоряет оператор пересечения && (overlaps) при проверке дублей.
create index if not exists idx_listings_photo_hashes on listings using gin (photo_hashes);
