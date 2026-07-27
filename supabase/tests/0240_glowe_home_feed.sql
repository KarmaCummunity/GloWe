-- Regression for migration 0240 — glowe_home_feed shape + pagination.
begin;
select plan(3);

select has_function(
  'public',
  'glowe_home_feed',
  array['integer', 'integer'],
  'glowe_home_feed(limit, offset) exists'
);

select ok(
  (
    select count(*) >= 0
      from public.glowe_home_feed(5, 0)
  ),
  'glowe_home_feed returns without error'
);

select ok(
  (
    select count(*) <= 3
      from public.glowe_home_feed(3, 0)
  ),
  'glowe_home_feed respects limit'
);

select * from finish();
rollback;
