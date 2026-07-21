-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic checkout RPC for Plumio
-- Run this once in the Supabase SQL Editor (Database → SQL Editor → New query).
-- Safe to re-run — all DDL steps are idempotent.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 0. listings.status column ────────────────────────────────────────────────
alter table public.listings
  add column if not exists status text not null default 'active'
    check (status in ('active', 'reserved', 'sold', 'inactive'));


-- ── 1. transactions columns — add if missing, fix the check constraint ────────
--    A previous migration may have added fulfillment_method with the wrong
--    allowed values ('meetup', 'delivery'). The frontend uses 'handoff', so
--    we drop the old constraint (if it exists) and add the correct one.

alter table public.transactions
  add column if not exists fulfillment_method text,
  add column if not exists delivery_address   text,
  add column if not exists meetup_location    text;

-- Drop the auto-generated constraint regardless of whether it came from
-- a previous migration or not (IF EXISTS makes this safe).
alter table public.transactions
  drop constraint if exists transactions_fulfillment_method_check;

-- Add the correct constraint: 'handoff' (face-to-face) | 'delivery' (courier)
alter table public.transactions
  add constraint transactions_fulfillment_method_check
    check (fulfillment_method in ('handoff', 'delivery'));


-- ── 2. Atomic checkout function ───────────────────────────────────────────────
--    Called from React via supabase.rpc('checkout_cart', {...}).
--    Runs in one implicit PostgreSQL transaction — any exception rolls back
--    every insert, update, and delete that happened inside it.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.checkout_cart(
  p_fulfillment_method  text,
  p_meetup_location     text  default null,
  p_delivery_address    text  default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth   -- prevent search_path injection
as $$
declare
  v_buyer_id    uuid;
  v_item        record;
  v_tx_id       uuid;
  v_first_tx_id uuid;
  v_tx_ids      uuid[]  := '{}';
  v_count       integer := 0;
begin

  -- Step 1: Require an authenticated caller
  v_buyer_id := auth.uid();
  if v_buyer_id is null then
    raise exception 'Authentication required'
      using errcode = 'P0401';
  end if;

  -- Step 2: Validate fulfillment method and required location fields
  if p_fulfillment_method not in ('handoff', 'delivery') then
    raise exception 'Invalid fulfillment method: %', p_fulfillment_method
      using errcode = 'P0422';
  end if;

  if p_fulfillment_method = 'handoff'
     and (p_meetup_location is null or trim(p_meetup_location) = '') then
    raise exception 'A meetup location is required for face-to-face handoff orders'
      using errcode = 'P0422';
  end if;

  if p_fulfillment_method = 'delivery'
     and (p_delivery_address is null or trim(p_delivery_address) = '') then
    raise exception 'A delivery address is required for delivery orders'
      using errcode = 'P0422';
  end if;

  -- Step 3: Process each cart item
  --    FOR UPDATE OF listings serialises concurrent checkouts for the same
  --    listing — the second buyer sees status = 'reserved' and gets an error.
  for v_item in
    select
      ci.id       as cart_item_id,
      ci.quantity,
      l.id        as listing_id,
      l.title,
      l.price,
      l.user_id   as seller_id,
      l.status    as listing_status
    from  public.cart_items ci
    join  public.listings   l on l.id = ci.listing_id
    where ci.user_id = v_buyer_id
    order by ci.created_at
    for update of l
  loop

    -- Guard: listing must still be available
    if v_item.listing_status <> 'active' then
      raise exception 'Sorry, "%" is no longer available for purchase.', v_item.title
        using errcode = 'P0001';
    end if;

    -- Guard: buyers cannot purchase their own listings
    if v_item.seller_id = v_buyer_id then
      raise exception 'You cannot purchase your own listing "%".', v_item.title
        using errcode = 'P0001';
    end if;

    -- Insert one transaction row per listing
    insert into public.transactions (
      listing_id,
      buyer_id,
      seller_id,
      amount,
      status,
      transaction_type,
      fulfillment_method,
      meetup_location,
      delivery_address
    )
    values (
      v_item.listing_id,
      v_buyer_id,
      v_item.seller_id,
      v_item.price * v_item.quantity,   -- per-item amount (not cart total)
      'escrow_locked',
      'escrow',
      p_fulfillment_method,
      p_meetup_location,
      p_delivery_address
    )
    returning id into v_tx_id;

    if v_first_tx_id is null then
      v_first_tx_id := v_tx_id;
    end if;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
    v_count  := v_count + 1;

    -- Reserve the listing so no other buyer can purchase it
    update public.listings
    set    status = 'reserved'
    where  id = v_item.listing_id;

  end loop;

  -- Step 4: Reject an empty cart
  if v_count = 0 then
    raise exception 'Your cart is empty'
      using errcode = 'P0001';
  end if;

  -- Step 5: Clear the buyer's cart
  delete from public.cart_items where user_id = v_buyer_id;

  -- Step 6: Return results to the React frontend
  return jsonb_build_object(
    'first_tx_id', v_first_tx_id,
    'tx_ids',      to_jsonb(v_tx_ids),
    'count',       v_count
  );

exception
  when others then
    raise;   -- re-raise triggers the implicit rollback

end;
$$;


-- ── 3. Restrict execution to authenticated users only ────────────────────────
revoke execute on function public.checkout_cart(text, text, text) from public, anon;
grant  execute on function public.checkout_cart(text, text, text) to authenticated;
