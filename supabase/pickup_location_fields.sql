-- ─────────────────────────────────────────────────────────────────────────────
-- Structured pickup location fields — run once in the Supabase SQL Editor.
-- Lets CreateListingScreen's Pickup Location section store City/District/
-- Postcode separately (so editing a listing can re-populate them exactly),
-- alongside the existing location_label (derived display string) and
-- latitude/longitude. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.listings
  add column if not exists pickup_city     text,
  add column if not exists pickup_district text,
  add column if not exists pickup_postcode text;
