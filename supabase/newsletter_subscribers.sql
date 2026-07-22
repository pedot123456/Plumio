-- ─────────────────────────────────────────────────────────────────────────────
-- Newsletter signups from the site footer — run once in the Supabase SQL Editor.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.newsletter_subscribers (
  id          bigserial    primary key,
  email       text         not null unique,
  created_at  timestamptz  not null default now()
);

alter table public.newsletter_subscribers enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'newsletter_subscribers' and policyname = 'newsletter_insert_anyone'
  ) then
    execute $p$
      create policy "newsletter_insert_anyone" on public.newsletter_subscribers
        for insert to anon, authenticated
        with check (true)
    $p$;
  end if;
end $$;
