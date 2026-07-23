import { supabase } from '../supabase';
import { notify } from './notify';

// Credits the seller's PlumioPay wallet balance and notifies them once escrow
// is actually released (buyer confirmed receipt, or handoff QR scanned/manually
// confirmed) — never at "I've Paid", since funds stay held in escrow until then.
// Best-effort: failures here shouldn't block the buyer's own confirmation flow.
export async function creditSellerWallet(tx) {
  if (!tx?.seller_id || !tx?.amount) return;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', tx.seller_id)
      .maybeSingle();
    const newBalance = Number(profile?.balance ?? 0) + Number(tx.amount);
    await supabase.from('profiles').update({ balance: newBalance }).eq('id', tx.seller_id);

    await notify(tx.seller_id, {
      type:  'escrow_released',
      title: '💰 Payment Received!',
      body:  `RM ${Number(tx.amount).toFixed(2)} for "${tx.listing?.title ?? 'your item'}" has been added to your PlumioPay Wallet. Claim it anytime from Profile → Wallet.`,
      data:  { tx_id: tx.id },
    });
  } catch (_) {
    // non-fatal
  }
}
