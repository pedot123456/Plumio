-- ─────────────────────────────────────────────────────────────────────────────
-- Claim Earnings feature — run once in the Supabase SQL Editor.
-- Ensures the profile columns SignUpScreen/WalletScreen already assume exist,
-- and adds a payouts table to record claim/withdrawal history.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists balance        numeric(12,2) not null default 0,
  add column if not exists bank_name      text,
  add column if not exists account_name   text,
  add column if not exists account_number text;

-- Tracks which completed sales have already been paid out, so Claimable
-- Earnings is computed directly from real sales (source of truth) instead of
-- the separate profiles.balance field, which can drift out of sync with it.
alter table public.transactions
  add column if not exists payout_claimed boolean not null default false;

create table if not exists public.payouts (
  id              bigserial    primary key,
  user_id         uuid         not null references auth.users (id) on delete cascade,
  amount          numeric(12,2) not null check (amount > 0),
  bank_name       text         not null,
  account_name    text         not null,
  account_number  text         not null,
  status          text         not null default 'completed'
                               check (status in ('processing', 'completed', 'failed')),
  created_at      timestamptz  not null default now()
);

alter table public.payouts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payouts' and policyname = 'payouts_select_own'
  ) then
    execute $p$
      create policy "payouts_select_own" on public.payouts
        for select to authenticated
        using (user_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payouts' and policyname = 'payouts_insert_own'
  ) then
    execute $p$
      create policy "payouts_insert_own" on public.payouts
        for insert to authenticated
        with check (user_id = auth.uid())
    $p$;
  end if;
end $$;
