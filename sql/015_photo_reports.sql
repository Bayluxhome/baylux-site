-- Фотоотчёты состояния квартиры после гостя. Грузит ответственный/админ, собственник видит.
create table if not exists photo_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  photos text[] default '{}',
  note text,
  created_at timestamptz default now(),
  created_by text
);
create index if not exists photo_reports_listing_idx on photo_reports (listing_id, created_at desc);
