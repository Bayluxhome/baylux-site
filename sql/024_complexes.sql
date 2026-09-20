-- Новостройки (раздел /novostroyki), этап 1.
--
-- Собственная база жилых комплексов, которые вносят менеджеры: только объекты, по которым
-- у агентства есть договор на комиссию. Спарсенные объявления сюда не попадают.
-- Право доступа — «Новостройки» (complexes) в правах сотрудника.

create table if not exists complexes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,             -- из названия, для /novostroyki/<slug>
  status text not null default 'draft',  -- draft / published / hidden
  featured boolean not null default false, -- «Рекомендуем» — показывается первым крупной карточкой
  sort_weight int not null default 0,    -- ручной приоритет в сортировке «популярные» (больше — выше)

  name text not null,                    -- название ЖК (латиница/как у застройщика — не переводим)
  kind text not null default 'apartments', -- apartments / cottages / mixed
  developer text,
  city text not null default 'Батуми',   -- ключ справочника городов (CITY_TR)
  district text,                         -- район, свободный текст (фильтр «Район»)
  address text,
  lat double precision,
  lng double precision,

  -- Локализованные тексты: RU обязателен, EN/KA заполняются по возможности (иначе показываем RU)
  desc_ru text, desc_en text, desc_ka text,
  nearby_ru text, nearby_en text, nearby_ka text,   -- «Что рядом»

  -- Витринные цифры уровня ЖК
  price_from numeric,                    -- цена за м², USD, «от»
  area_from numeric,                     -- площадь от, м²
  completion_q smallint,                 -- квартал сдачи 1..4 (null = сдан/неизвестно)
  completion_year smallint,              -- год сдачи
  completed boolean not null default false, -- сдан
  installment_months smallint,           -- рассрочка, мес (null/0 = нет)
  sea_distance_m int,                    -- до моря, м
  roi_percent numeric,                   -- ожидаемая доходность, % в год — вводит менеджер вручную
  premium boolean not null default false,
  renovated boolean not null default false, -- «с ремонтом»
  for_investment boolean not null default false,
  eco boolean not null default false,
  amenities text,                        -- через запятую: pool, parking, gym, concierge, ...

  photos jsonb not null default '[]'::jsonb,   -- публичные URL из storage listing-photos
  cover text,                            -- обложка (URL), если пусто — photos[0]

  expert_id text,                        -- риелтор-эксперт: realtors.id (числовой), см. 025 для уже созданных таблиц
  contract_note text,                    -- служебное: условия договора/комиссии — публично НЕ показывается

  views int not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists complexes_status_idx on complexes (status);
create index if not exists complexes_city_idx on complexes (city);

-- Планировки / квартиры внутри ЖК (этап 1: простой список с ценами)
create table if not exists complex_units (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references complexes(id) on delete cascade,
  label text,                            -- «Студия», «1+1», «2+1», «Пентхаус» — свободный текст
  rooms smallint,                        -- 0 = студия
  area numeric,                          -- м²
  price numeric,                         -- полная цена, USD
  floor text,                            -- «5–12» или «7»
  available boolean not null default true,
  plan_photo text,                       -- планировка (URL)
  sort_weight int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists complex_units_complex_idx on complex_units (complex_id, sort_weight);

alter table complexes enable row level security;
alter table complex_units enable row level security;
