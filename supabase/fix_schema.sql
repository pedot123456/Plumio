-- ─────────────────────────────────────────────────────────────────────────────
-- Schema Fix — run once in Supabase SQL Editor.
-- Fixes two problems:
--   1. transactions.listing_id was uuid but listings.id is bigint
--   2. reviews table doesn't exist yet
--   3. reports table doesn't exist yet
-- Safe to re-run — conditional logic throughout.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Fix transactions.listing_id ───────────────────────────────────────────
--    Drop the column (regardless of type) and re-add as bigint.
--    This is safe in dev — the checkout RPC writes fresh rows every checkout.

alter table public.transactions
  drop column if exists listing_id;

alter table public.transactions
  add column if not exists listing_id bigint;


-- ── 2. reviews table ─────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id           bigserial    primary key,
  listing_id   bigint       references public.listings (id) on delete cascade,
  reviewer_id  uuid         references auth.users      (id) on delete cascade,
  rating       smallint     not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz  not null default now()
);

-- One review per buyer per listing
create unique index if not exists reviews_listing_reviewer_uidx
  on public.reviews (listing_id, reviewer_id);

alter table public.reviews enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reviews' and policyname = 'reviews_select'
  ) then
    execute $p$
      create policy "reviews_select" on public.reviews
        for select using (true)
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reviews' and policyname = 'reviews_insert'
  ) then
    execute $p$
      create policy "reviews_insert" on public.reviews
        for insert to authenticated
        with check (reviewer_id = auth.uid())
    $p$;
  end if;
end $$;


-- ── 3. reports table ─────────────────────────────────────────────────────────
create table if not exists public.reports (
  id             bigserial    primary key,
  reporter_id    uuid         references auth.users     (id) on delete set null,
  listing_id     bigint       references public.listings (id) on delete set null,
  seller_id      uuid         references auth.users     (id) on delete set null,
  delivery_type  text         not null check (delivery_type in ('local', 'courier')),
  issue_type     text         not null,
  description    text,
  status         text         not null default 'open'
                              check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  created_at     timestamptz  not null default now()
);

alter table public.reports enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reports' and policyname = 'reports_select_own'
  ) then
    execute $p$
      create policy "reports_select_own" on public.reports
        for select to authenticated
        using (reporter_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reports' and policyname = 'reports_insert'
  ) then
    execute $p$
      create policy "reports_insert" on public.reports
        for insert to authenticated
        with check (reporter_id = auth.uid())
    $p$;
  end if;
end $$;
