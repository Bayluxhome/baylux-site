-- Перенос старых фото объявлений из Supabase Storage в Cloudflare R2 (T-20261118-05, п.4).
-- Журнал и откат: до обновления listings.photos сюда пишутся старые и новые ссылки.
-- Оригиналы в Supabase НЕ удаляются. Выполнить в Supabase SQL Editor ДО пробного переноса.
create table if not exists photo_migration (
  id bigserial primary key,
  listing_id text not null,
  old_photos jsonb not null,
  new_photos jsonb not null,
  old_facade text,
  new_facade text,
  photos_count int not null default 0,
  bytes_old bigint,
  bytes_new bigint,
  status text not null default 'done',   -- done | rolled_back | failed
  created_at timestamptz not null default now(),
  rolled_back_at timestamptz
);
create index if not exists photo_migration_listing_idx on photo_migration (listing_id);
alter table photo_migration enable row level security; -- только сервер (service_role)
