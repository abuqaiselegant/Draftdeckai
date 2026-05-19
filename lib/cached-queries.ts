import type { SupabaseClient } from '@supabase/supabase-js';
import { queryCache, cacheKeys } from './query-cache';
import { trackQuery } from './performance-optimizer';
import { TIER_LIMITS, getCreditsResetDate, shouldResetCredits } from './credits-service';
import type { UserCreditsRow } from './credit-operations';

// 15 s TTL — short enough that users see fresh data on any page refresh,
// but eliminates repeated DB reads within a single generate-request burst.
const CREDITS_TTL_MS = 15_000;

export async function getCachedUserCredits(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<UserCreditsRow | null> {
  const key = cacheKeys.userCredits(userId);
  const cached = queryCache.get<UserCreditsRow>(key);
  if (cached) return cached;

  const t0 = Date.now();
  const { data } = await supabaseAdmin
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();
  trackQuery('user_credits_select', Date.now() - t0);

  let row = data as UserCreditsRow | null;

  if (!row) {
    const { data: newRow, error: insertError } = await supabaseAdmin
      .from('user_credits')
      .insert({
        user_id: userId,
        tier: 'free',
        credits_total: TIER_LIMITS.free,
        credits_used: 0,
        credits_reset_at: getCreditsResetDate(),
      })
      .select()
      .single();

    if (insertError || !newRow) return null;
    row = newRow as UserCreditsRow;
  }

  if (shouldResetCredits(row.credits_reset_at)) {
    const resetAt = getCreditsResetDate();
    const { data: resetRow } = await supabaseAdmin
      .from('user_credits')
      .update({ credits_used: 0, credits_reset_at: resetAt })
      .eq('user_id', userId)
      .select()
      .single();
    row = resetRow ? (resetRow as UserCreditsRow) : { ...row, credits_used: 0, credits_reset_at: resetAt };
  }

  queryCache.set(key, row, CREDITS_TTL_MS);
  return row;
}

export function invalidateUserCredits(userId: string): void {
  queryCache.invalidate(cacheKeys.userCredits(userId));
}
