-- Baylux: язык объявления + автоперевод описаний
-- Запустить в Supabase → SQL Editor

-- Язык, на котором подано объявление (ru/en/ka)
alter table listings add column if not exists lang text default 'ru';

-- Переводы описания (заполняются автопереводом при одобрении)
alter table listings add column if not exists desc_ru text;
alter table listings add column if not exists desc_en text;
alter table listings add column if not exists desc_ka text;

-- Предпочитаемый язык пользователя бота (для меню при следующем входе)
alter table users add column if not exists lang text default 'ru';
