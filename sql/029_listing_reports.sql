-- 06.11.2026: жалобы посетителей на объявления (кнопка «Пожаловаться» на странице объекта).
-- 2 жалобы «непристойное» или «фейк» от разных посетителей → объявление скрывается (status pending) до проверки.
create table if not exists listing_reports (
  id bigserial primary key,
  listing_id text not null,
  reason text not null,          -- bad | fake | sold | other
  ip_hash text,
  created_at timestamptz not null default now(),
  unique (listing_id, ip_hash)
);
create index if not exists listing_reports_listing_idx on listing_reports (listing_id);
