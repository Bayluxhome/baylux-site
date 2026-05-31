-- Журнал согласий пользователей (ПД-закон Грузии / GDPR-подобный)
-- Запустить в Supabase → SQL Editor
create table if not exists user_consents (
  id bigserial primary key,
  tg_user_id bigint,
  email text,
  consent_type text not null,   -- 'privacy' | 'marketing'
  doc_version text,
  ip text,
  accepted_at timestamptz default now()
);
create index if not exists user_consents_tg_idx on user_consents (tg_user_id);
create index if not exists user_consents_email_idx on user_consents (email);
