-- Заявки: доставка менеджеру, статус, ответственный (задача №03).
--
-- Раньше заявка писалась в leads и одним сообщением уходила в общий Telegram-чат.
-- Если Telegram отвечал ошибкой — никто не узнавал, повтора не было. В кабинете заявку
-- видел только владелец объявления, а сотрудники — нет. Здесь добавляем поля, чтобы:
--   • фиксировать факт и ошибку доставки и досылать кроном;
--   • хранить машинный тип заявки (не зависящий от языка посетителя);
--   • хранить, кому заявка назначена и кто её взял в работу.

alter table leads add column if not exists type_key text;            -- viewing / rent / management / complex / cleaning / landing
alter table leads add column if not exists notified_at timestamptz;  -- когда уведомление ушло хотя бы одному получателю
alter table leads add column if not exists notify_error text;        -- текст последней ошибки доставки
alter table leads add column if not exists notify_attempts int not null default 0;
alter table leads add column if not exists assigned_email text;      -- ответственный (email)
alter table leads add column if not exists assigned_tg bigint;       -- ответственный (telegram id)
alter table leads add column if not exists handled_by text;          -- кто сменил статус (email или tg:id)
alter table leads add column if not exists handled_at timestamptz;

-- Для крона: недоставленные и не заброшенные (до 10 попыток).
create index if not exists leads_undelivered_idx on leads (created_at) where notified_at is null;
-- Для защиты от дубля: тот же телефон + объект за последние минуты.
create index if not exists leads_phone_listing_idx on leads (phone, listing_id, created_at desc);

-- Задача №02: ссылка на исходное объявление (пост в Telegram-группе), из колонки _link парсинга.
-- Служебное поле: наружу не отдаётся (см. lib/privacy.js), видно сотрудникам с правами.
alter table listings add column if not exists source_url text;
