-- Исправление к 024: id риелторов в таблице realtors — числовые, а не UUID.
-- Поле эксперта делаем текстовым, чтобы принимать любой формат id.
alter table complexes alter column expert_id type text using expert_id::text;
