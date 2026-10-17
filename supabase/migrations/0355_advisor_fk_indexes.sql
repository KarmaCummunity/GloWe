-- 0355_advisor_fk_indexes | KC#945 — indexes on FK columns missing covering indexes
-- (unindexed_foreign_keys advisors for recent marketplace/time/giving tables).

begin;

create index if not exists listing_user_signals_listing_idx
  on public.listing_user_signals (listing_id);

create index if not exists volunteer_opportunities_organizer_idx
  on public.volunteer_opportunities (organizer_id);

create index if not exists volunteer_opportunities_org_idx
  on public.volunteer_opportunities (org_id)
  where org_id is not null;

create index if not exists volunteer_shifts_opportunity_idx
  on public.volunteer_shifts (opportunity_id);

create index if not exists volunteer_signups_shift_idx
  on public.volunteer_shift_signups (shift_id);

create index if not exists giving_handoff_ratings_handoff_idx
  on public.giving_handoff_ratings (handoff_id);

create index if not exists giving_handoff_ratings_rater_idx
  on public.giving_handoff_ratings (rater_id);

create index if not exists giving_handoff_ratings_ratee_idx
  on public.giving_handoff_ratings (ratee_id);

-- money world: beneficiary org FK on listings (0360)
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'listings'
       and column_name = 'beneficiary_org_id'
  ) then
    execute 'create index if not exists listings_beneficiary_org_idx
      on public.listings (beneficiary_org_id)
      where beneficiary_org_id is not null';
  end if;
end $$;

commit;
