-- Флаг «объект под управлением Baylux» (для раздела Holiday Homes и бейджа в каталоге).
alter table listings add column if not exists managed_by_baylux boolean default false;
create index if not exists listings_managed_idx on listings (managed_by_baylux) where managed_by_baylux = true;
