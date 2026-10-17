-- supabase/tests/0391_rides_knowledge_flows.sql | 0390–0399 behaviour:
-- rides: PostGIS corridor match, seat booking (capacity, duplicate), confirm, trip complete
--        (karma + listing close), rating; knowledge: slot booking, complete, rating.

begin;

create or replace function pg_temp.mk_user(p_id uuid, p_handle text)
returns void language plpgsql as $$
begin
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role)
  values (p_id, p_handle || '@test.local', now(),
          jsonb_build_object('full_name', 'Display ' || p_handle),
          jsonb_build_object('provider', 'email'),
          'authenticated', 'authenticated');
  update public.users
     set share_handle = p_handle, display_name = 'Display ' || p_handle,
         account_status = 'active', privacy_mode = 'Public'
   where user_id = p_id;
end $$;

create or replace function pg_temp.as_user(p_id uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
    jsonb_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;

select pg_temp.mk_user('00000000-0000-0000-0000-000000391001', 'rk_driver');
select pg_temp.mk_user('00000000-0000-0000-0000-000000391002', 'rk_pass1');
select pg_temp.mk_user('00000000-0000-0000-0000-000000391003', 'rk_pass2');

-- Driver offers 1 seat Tel Aviv → Jerusalem, departing in 30 minutes.
select pg_temp.as_user('00000000-0000-0000-0000-000000391001');
insert into public.listings (
  listing_id, owner_id, world_slug, kind_id, direction, title, origin, moderation_status,
  details, expires_at
)
select '00000000-0000-0000-0000-0000003910a1', '00000000-0000-0000-0000-000000391001',
       'rides', kind_id, 'give', 'TLV to JLM', 'native', 'published',
       jsonb_build_object(
         'origin_label', 'Tel Aviv', 'origin_lat', 32.0853, 'origin_lng', 34.7818,
         'dest_label', 'Jerusalem', 'dest_lat', 31.7683, 'dest_lng', 35.2137,
         'departs_at', to_char((now() + interval '30 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'seats_available', 1),
       now() + interval '1 day'
  from public.listing_kinds where world_slug = 'rides' and slug = 'ride_offer';

-- 1) Corridor match: near both ends → found; far corridor → not found.
do $$
declare
  v_n int;
  v_seats int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000391002');
  select count(*), max(seats_left) into v_n, v_seats
    from public.find_ride_listing_matches(32.07, 34.79, 31.78, 35.20)
   where listing_id = '00000000-0000-0000-0000-0000003910a1';
  if v_n <> 1 or v_seats <> 1 then
    raise exception 'ASSERT FAILED: expected corridor match with 1 seat, got n=% seats=%', v_n, v_seats;
  end if;
  select count(*) into v_n
    from public.find_ride_listing_matches(32.79, 34.99, 29.55, 34.95)  -- Haifa → Eilat
   where listing_id = '00000000-0000-0000-0000-0000003910a1';
  if v_n <> 0 then
    raise exception 'ASSERT FAILED: far corridor should not match';
  end if;
end $$;

-- 2) Booking: passenger 1 books; duplicate and over-capacity bookings fail; owner can't book.
do $$
declare
  v_h public.giving_handoffs;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000391002');
  v_h := public.book_ride_seat('00000000-0000-0000-0000-0000003910a1', 1);
  if v_h.status <> 'reserved' or v_h.world_slug <> 'rides' or v_h.seats <> 1 then
    raise exception 'ASSERT FAILED: booking should be reserved rides x1, got % % %', v_h.status, v_h.world_slug, v_h.seats;
  end if;

  begin
    perform public.book_ride_seat('00000000-0000-0000-0000-0000003910a1', 1);
    raise exception 'ASSERT FAILED: duplicate booking should fail';
  exception when unique_violation then
    if sqlerrm <> 'already_booked' then raise exception 'ASSERT FAILED: expected already_booked, got %', sqlerrm; end if;
  end;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000391003');
  begin
    perform public.book_ride_seat('00000000-0000-0000-0000-0000003910a1', 1);
    raise exception 'ASSERT FAILED: over-capacity booking should fail';
  exception when raise_exception then
    if sqlerrm <> 'seats_exhausted' then raise exception 'ASSERT FAILED: expected seats_exhausted, got %', sqlerrm; end if;
  end;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000391001');
  begin
    perform public.book_ride_seat('00000000-0000-0000-0000-0000003910a1', 1);
    raise exception 'ASSERT FAILED: owner booking should fail';
  exception when check_violation then
    if sqlerrm <> 'own_listing' then raise exception 'ASSERT FAILED: expected own_listing, got %', sqlerrm; end if;
  end;
end $$;

-- 3) Driver confirms, passenger completes: handed_over, karma for both, listing closed,
--    rating works and the rated handoff drops out of get_listing_handoff.
do $$
declare
  v_id uuid;
  v_h public.giving_handoffs;
  v_status text;
  v_karma int;
begin
  select handoff_id into v_id from public.giving_handoffs
   where listing_id = '00000000-0000-0000-0000-0000003910a1'
     and recipient_id = '00000000-0000-0000-0000-000000391002';

  perform pg_temp.as_user('00000000-0000-0000-0000-000000391001');
  v_h := public.confirm_ride_booking(v_id);
  if v_h.status <> 'confirmed' then raise exception 'ASSERT FAILED: expected confirmed, got %', v_h.status; end if;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000391002');
  v_h := public.complete_ride_trip(v_id);
  if v_h.status <> 'handed_over' then raise exception 'ASSERT FAILED: expected handed_over, got %', v_h.status; end if;
  begin
    perform public.complete_ride_trip(v_id);
    raise exception 'ASSERT FAILED: completing twice should fail';
  exception when check_violation then
    if sqlerrm <> 'invalid_status' then raise exception 'ASSERT FAILED: expected invalid_status, got %', sqlerrm; end if;
  end;
end $$;

do $$
declare
  v_id uuid;
  v_status text;
  v_n int;
begin
  select handoff_id into v_id from public.giving_handoffs
   where listing_id = '00000000-0000-0000-0000-0000003910a1'
     and recipient_id = '00000000-0000-0000-0000-000000391002';

  select status into v_status from public.listings where listing_id = '00000000-0000-0000-0000-0000003910a1';
  if v_status <> 'closed' then raise exception 'ASSERT FAILED: full ride should close, got %', v_status; end if;

  select count(*) into v_n from public.karma_ledger
   where ref_id = v_id::text and event_type in ('giving_handoff_giver', 'giving_handoff_receiver');
  if v_n <> 2 then raise exception 'ASSERT FAILED: expected 2 karma rows, got %', v_n; end if;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000391002');
  if public.get_listing_handoff('00000000-0000-0000-0000-0000003910a1') ->> 'status' <> 'handed_over' then
    raise exception 'ASSERT FAILED: unrated handed_over handoff should be returned for rating';
  end if;
  perform public.rate_giving_handoff(v_id, 5::smallint, 'Great ride');
  if public.get_listing_handoff('00000000-0000-0000-0000-0000003910a1') is not null then
    raise exception 'ASSERT FAILED: rated handoff should no longer be returned';
  end if;
end $$;

-- 4) Knowledge: one-slot private lesson starting in 10 minutes.
-- Publishing in knowledge requires a verified member (0264 has_world_permission).
update public.users set verified_at = now() where user_id = '00000000-0000-0000-0000-000000391001';
select pg_temp.as_user('00000000-0000-0000-0000-000000391001');
insert into public.listings (
  listing_id, owner_id, world_slug, kind_id, direction, title, origin, moderation_status, details
)
select '00000000-0000-0000-0000-0000003910b1', '00000000-0000-0000-0000-000000391001',
       'knowledge', kind_id, 'give', 'Intro to Python', 'native', 'published',
       jsonb_build_object(
         'topic', 'Python', 'modality', 'video', 'slots_available', 1,
         'slot_starts_at', to_char((now() + interval '10 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'slot_ends_at', to_char((now() + interval '70 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
  from public.listing_kinds where world_slug = 'knowledge' and slug = 'private_lesson';
-- Knowledge listings start in pending_review (0266); simulate moderator approval.
update public.listings set moderation_status = 'published'
 where listing_id = '00000000-0000-0000-0000-0000003910b1';

do $$
declare
  v_h public.giving_handoffs;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000391002');
  v_h := public.book_knowledge_slot('00000000-0000-0000-0000-0000003910b1');
  if v_h.status <> 'reserved' or v_h.slot_starts_at is null then
    raise exception 'ASSERT FAILED: knowledge booking should be reserved with slot time';
  end if;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000391003');
  begin
    perform public.book_knowledge_slot('00000000-0000-0000-0000-0000003910b1');
    raise exception 'ASSERT FAILED: second booking on 1 slot should fail';
  exception when raise_exception then
    if sqlerrm <> 'slots_exhausted' then raise exception 'ASSERT FAILED: expected slots_exhausted, got %', sqlerrm; end if;
  end;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000391001');
  v_h := public.complete_knowledge_session(v_h.handoff_id);
  if v_h.status <> 'handed_over' then raise exception 'ASSERT FAILED: session should be handed_over'; end if;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000391002');
  perform public.rate_giving_handoff(v_h.handoff_id, 4::smallint, null);
end $$;

rollback;

\echo '✓ 0391_rides_knowledge_flows.sql passed'
