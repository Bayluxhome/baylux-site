-- 11.11 Дмитрий: на страницах новостроек экспертом стоит Sea Nest, заявки по ЖК уходят им. Меняем на Baylux.
-- 1) Проверка: сколько ЖК закреплено за каким экспертом
select r.name as expert, c.expert_id, count(*) as complexes
from complexes c left join realtors r on r.id::text = c.expert_id::text
group by 1, 2 order by 3 desc;

-- 2) Снять Sea Nest с экспертов: блок «Поможем подобрать» будет от Baylux (без чужой персоны),
--    заявки с кнопки «Получить подборку» пойдут в общий канал заявок Baylux.
update complexes c set expert_id = null
from realtors r
where r.id::text = c.expert_id::text and r.name ilike '%sea nest%';

-- 3) Повторная проверка (должно остаться 0 у Sea Nest)
select r.name as expert, count(*) from complexes c left join realtors r on r.id::text = c.expert_id::text group by 1;
