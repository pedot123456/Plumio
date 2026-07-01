import { supabase } from '../supabase';

export async function notify(userId, { type, title, body = '', data = {} }) {
  if (!userId) return;
  try {
    await supabase.from('notifications').insert({ user_id: userId, type, title, body, data });
  } catch (_) {
    // non-fatal
  }
}
