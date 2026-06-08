-- Фундамент сводки: внутренний номер квартиры (для привязки XLS) и email собственника (уведомления).
alter table listings add column if not exists internal_no text;
alter table listings add column if not exists owner_contact_email text;

-- Сообщения собственнику (доп. взносы, ремонты и т.д.). Публикует ответственный/админ, владелец получает на email.
create table if not exists owner_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  body text not null,
  created_at timestamptz default now(),
  created_by text
);
create index if not exists owner_messages_listing_idx on owner_messages (listing_id, created_at desc);
