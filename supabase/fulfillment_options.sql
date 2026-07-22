-- ─────────────────────────────────────────────────────────────────────────────
-- Per-listing fulfillment options — run once in the Supabase SQL Editor.
-- Lets a seller offer Handoff, Delivery, or both for a given listing, instead
-- of the old single delivery_type toggle (which was never actually saved).
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.listings
  add column if not exists allows_handoff  boolean not null default true,
  add column if not exists allows_delivery boolean not null default true;

-- A listing must offer at least one fulfillment method
alter table public.listings
  drop constraint if exists listings_fulfillment_check;
alter table public.listings
  add constraint listings_fulfillment_check
    check (allows_handoff or allows_delivery);
