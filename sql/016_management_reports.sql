-- Финансовая сводка по управляемым объектам, по месяцам. Загружается одним XLS на все квартиры.
-- period — месяц в формате YYYY-MM. Уникальность по объекту+месяцу = повторная загрузка обновляет.
create table if not exists management_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  period text not null,
  income numeric,
  payout numeric,
  commission numeric,
  utilities numeric,
  expenses numeric,
  note text,
  updated_at timestamptz default now(),
  unique (listing_id, period)
);
create index if not exists management_reports_listing_idx on management_reports (listing_id, period desc);
