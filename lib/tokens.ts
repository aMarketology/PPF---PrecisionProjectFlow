/**
 * Canonical token economy — single source of truth for both web and mobile.
 *
 * ⚠️ Do NOT hardcode token costs or pack sizes in individual files. Import
 * from here so the web app, mobile app, and Edge Functions never drift.
 *
 * SCALE (web canonical): 100 tokens = 1 conversation unlock.
 * The mobile Edge Function spec lists pack sizes 10/50/120, which is a
 * units error — those must be 100/500/1200 to match these costs (otherwise
 * the 100-token unlock cost would require 10 "starter" packs).
 */

/** How many tokens it costs to open a cold (locked) conversation thread. */
export const UNLOCK_COST = 100;

/** How many tokens it costs to send the first DM / contact a supplier. */
export const NEW_DM_COST = 75;

/** How many tokens it costs to submit an RFQ bid / proposal. */
export const RFQ_BID_COST = 50;

/** How many tokens it costs to send a meeting invitation. */
export const MEETING_COST = 50;

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  price_cents: number;
  unlocks: number;
}

/** One-time token packs. Prices in USD cents. 100 tokens = 1 unlock. */
export const TOKEN_PACKS: TokenPack[] = [
  { id: 'starter',  name: 'Starter',  tokens: 100,  price_cents: 1000, unlocks: 1  },
  { id: 'pro',      name: 'Pro',       tokens: 500,  price_cents: 4500, unlocks: 5  },
  { id: 'business', name: 'Business',  tokens: 1200, price_cents: 9900, unlocks: 12 },
];

export function getTokenPack(packId: string): TokenPack | undefined {
  return TOKEN_PACKS.find(p => p.id === packId);
}
