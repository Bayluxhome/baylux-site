-- Baylux: язык объявления + автоперевод описаний
-- Запустить в Supabase → SQL Editor

-- Язык, на котором подано объявление (ru/en/ka)
alter table listings add column if not exists lang text default 'ru';

-- Переводы описания (заполняются автопереводом при одобрении)
alter table listings add column if not exists desc_ru text;
alter table listings add column if not exists desc_en text;
alter table listings add column if not exists desc_ka text;

-- Переводы адреса/названия улицы (ЖК-бренд не переводится)
alter table listings add column if not exists name_ru text;
alter table listings add column if not exists name_en text;
alter table listings add column if not exists name_ka text;

-- Предпочитаемый язык пользователя бота (для меню при следующем входе)
alter table users add column if not exists lang text default 'ru';

-- Фото дома/фасада для обложки карточки здания/ЖК (если не задано — берём первое фото объявления)
alter table listings add column if not exists facade_photo text;

-- Вход по email (magic-link): email в токенах входа + владелец-объявления по email
alter table login_tokens add column if not exists email text;
alter table listings add column if not exists owner_email text;

-- В какой канал опубликован объект (для маршрутизации Батуми/Тбилиси и корректного снятия)
alter table listings add column if not exists tg_channel text;
