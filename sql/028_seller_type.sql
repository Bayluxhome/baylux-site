-- 06.11.2026: кто разместил объявление с сайта — собственник или агент (для рекламы среди собственников).
-- NULL = не указано (старые объявления, парсер). Выполнить в Supabase ДО деплоя кода.
alter table listings add column if not exists seller_type text check (seller_type in ('owner','agent'));
create index if not exists listings_seller_type_idx on listings (seller_type) where seller_type is not null;
