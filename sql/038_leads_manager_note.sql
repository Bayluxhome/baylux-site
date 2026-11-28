-- Раздел «Заявки» в админке (T-20261128-02, 28.11.2026): ответственный и комментарий сотрудника.
-- Выполнить один раз в Supabase SQL Editor. Данные не меняет и не удаляет, только добавляет две колонки.
-- До выполнения раздел «Заявки» работает (список, фильтры, смена статуса), но ответственный
-- и комментарий не сохраняются — страница сама покажет подсказку.
alter table leads add column if not exists manager text;       -- ответственный: 'dmitry' / 'tatiana' / null
alter table leads add column if not exists staff_note text;    -- комментарий сотрудника (клиенту не виден)
alter table leads add column if not exists staff_note_at timestamptz;
create index if not exists leads_status_idx on leads (status, created_at desc);
