-- 0354_advisor_rls_initplan | KC#945 — wrap auth.uid() in (select …) for RLS initplan.
-- Derived: kc-dev advisors MCP unavailable; fix marketplace/volunteer/handoff policies
-- still using bare auth.uid() in USING/WITH CHECK (TD-173 / Supabase perf guidance).

begin;

-- listing_user_signals (0323)
drop policy if exists listing_user_signals_select_own on public.listing_user_signals;
create policy listing_user_signals_select_own on public.listing_user_signals
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists listing_user_signals_insert_own on public.listing_user_signals;
create policy listing_user_signals_insert_own on public.listing_user_signals
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- volunteer_opportunities / shifts / signups (0370) — also collapse dual SELECT on signups
drop policy if exists volunteer_opportunities_read_open on public.volunteer_opportunities;
create policy volunteer_opportunities_read_open on public.volunteer_opportunities
  for select to authenticated
  using (status = 'open' or organizer_id = (select auth.uid()));

drop policy if exists volunteer_opportunities_organizer_write on public.volunteer_opportunities;
create policy volunteer_opportunities_organizer_write on public.volunteer_opportunities
  for all to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

drop policy if exists volunteer_shifts_organizer_write on public.volunteer_shifts;
create policy volunteer_shifts_organizer_write on public.volunteer_shifts
  for all to authenticated
  using (
    exists (
      select 1 from public.volunteer_opportunities o
       where o.opportunity_id = volunteer_shifts.opportunity_id
         and o.organizer_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.volunteer_opportunities o
       where o.opportunity_id = volunteer_shifts.opportunity_id
         and o.organizer_id = (select auth.uid())
    )
  );

drop policy if exists volunteer_signups_self on public.volunteer_shift_signups;
drop policy if exists volunteer_signups_organizer_read on public.volunteer_shift_signups;
create policy volunteer_signups_read on public.volunteer_shift_signups
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.volunteer_shifts s
      join public.volunteer_opportunities o on o.opportunity_id = s.opportunity_id
       where s.shift_id = volunteer_shift_signups.shift_id
         and o.organizer_id = (select auth.uid())
    )
  );

-- giving_handoffs / ratings (0380)
drop policy if exists giving_handoffs_participant_read on public.giving_handoffs;
create policy giving_handoffs_participant_read on public.giving_handoffs
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or recipient_id = (select auth.uid())
  );

drop policy if exists giving_handoff_ratings_participant_read on public.giving_handoff_ratings;
create policy giving_handoff_ratings_participant_read on public.giving_handoff_ratings
  for select to authenticated
  using (
    exists (
      select 1 from public.giving_handoffs h
       where h.handoff_id = giving_handoff_ratings.handoff_id
         and (
           h.owner_id = (select auth.uid())
           or h.recipient_id = (select auth.uid())
         )
    )
  );

commit;
