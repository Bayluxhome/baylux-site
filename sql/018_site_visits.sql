-- Анонимные визиты на сайт (раздел «Визиты на сайт» в CRM).
-- Таблица нужна для отсечения повторов по event_id: при сетевом сбое клиент ретраит
-- тот же визит, и без этой проверки в CRM ушёл бы дубль.
-- Персональные данные не хранятся: ни IP, ни User-Agent, ни fingerprint, ни контакты.
create table if not exists site_visits (
  event_id text primary key,
  visited_at timestamptz,
  session_id text,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  device_type text,
  language text,
  created_at timestamptz not null default now()
);
create index if not exists site_visits_created_idx on site_visits (created_at desc);
create index if not exists site_visits_session_idx on site_visits (session_id);
create index if not exists site_visits_utm_idx on site_visits (utm_source, utm_campaign);

alter table site_visits enable row level security;
