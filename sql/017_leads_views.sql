-- Кабинет риелтора: заявки (обращения) и просмотры объектов.
-- До этого заявки уходили только в Telegram и нигде не хранились, а просмотры не считались —
-- поэтому в кабинете нечего было показывать в блоках «Обращения» и «Просмотры».

-- 1) ЗАЯВКИ. Пишутся при отправке формы на сайте. listing_id/owner_* заполняются,
-- когда заявка пришла с карточки конкретного объекта — по ним риелтор видит свои обращения.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  phone text,
  comment text,
  type text,                         -- тип заявки: Продажа / Аренда / Управление и т.п.
  object_title text,                 -- как объект назывался в форме (человекочитаемо)
  listing_id text,                   -- объявление, с которого пришла заявка
  owner_email text,                  -- владелец объявления (риелтор) — email
  owner_tg bigint,                   -- владелец объявления (риелтор) — telegram id
  source text,                       -- страница-источник: property / building / home
  status text not null default 'new',-- new / in_work / done
  utm_source text,
  utm_medium text,
  utm_campaign text
);
create index if not exists leads_created_idx on leads (created_at desc);
create index if not exists leads_listing_idx on leads (listing_id);
create index if not exists leads_owner_email_idx on leads (lower(owner_email));
create index if not exists leads_owner_tg_idx on leads (owner_tg);

-- 2) ПРОСМОТРЫ. Агрегируем по дням: одна строка на объект в день.
-- Так таблица остаётся компактной даже при росте трафика, и легко строится график за 30 дней.
create table if not exists listing_views (
  listing_id text not null,
  day date not null default current_date,
  views integer not null default 0,
  primary key (listing_id, day)
);
create index if not exists listing_views_day_idx on listing_views (day desc);

-- Атомарный инкремент просмотра (без гонок при одновременных запросах).
create or replace function bump_listing_view(p_listing text)
returns void
language sql
as $$
  insert into listing_views (listing_id, day, views)
  values (p_listing, current_date, 1)
  on conflict (listing_id, day)
  do update set views = listing_views.views + 1;
$$;

-- Обе таблицы читает/пишет только сервер (service_role), поэтому анонимный доступ закрываем.
alter table leads enable row level security;
alter table listing_views enable row level security;
