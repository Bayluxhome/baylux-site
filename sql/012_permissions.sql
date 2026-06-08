-- Гранулярные права сотрудников. Массив ключей из реестра lib/permissions.js.
alter table site_users add column if not exists permissions text[] default '{}';
-- Перенос: у кого уже был полный грант (is_admin=true) — даём все текущие права.
update site_users
set permissions = array['moderate','managed','news','realtors','users']
where is_admin = true and (permissions is null or array_length(permissions, 1) is null);
