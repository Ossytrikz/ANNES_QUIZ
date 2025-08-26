-- Optional analytics helpers. Run in Supabase SQL editor if you want richer reports.

-- 1) Item statistics across all attempts (difficulty & timing)
create or replace view public.item_stats as
select
  r.question_id,
  avg(case when r.is_correct then 1 else 0 end)::float as p_value,
  corr((r.is_correct::int)::float, a.score_total::float) as point_biserial,
  avg(r.time_taken)/1000.0 as avg_time_s,
  percentile_cont(0.25) within group (order by r.time_taken)/1000.0 as p25_time_s,
  percentile_cont(0.50) within group (order by r.time_taken)/1000.0 as p50_time_s,
  percentile_cont(0.75) within group (order by r.time_taken)/1000.0 as p75_time_s,
  count(*) as n
from attempt_answers r
join attempts a on a.id = r.attempt_id
group by r.question_id;

-- 2) Topic mastery for one attempt (expects questions.tags or questions.meta->'tags')
create or replace function public.attempt_topic_mastery(p_attempt uuid)
returns table (
  topic text,
  correct_count int,
  total_count int,
  percent numeric,
  time_s numeric
) language sql stable as $$
  with q as (
    select r.*, q.tags, (r.time_taken/1000.0) as time_s
    from attempt_answers r
    join questions q on q.id = r.question_id
    where r.attempt_id = p_attempt
  ),
  exploded as (
    select unnest(coalesce(q.tags, array['General'])) as topic,
           (r.is_correct) as is_correct,
           q.time_s
    from q r
  )
  select topic,
         sum(case when is_correct then 1 else 0 end) as correct_count,
         count(*) as total_count,
         (sum(case when is_correct then 1 else 0 end)::numeric / count(*)) * 100.0 as percent,
         sum(time_s) as time_s
  from exploded
  group by topic
  order by percent asc nulls last;
$$;
