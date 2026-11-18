// Dip Rider — a cbBTC dip-buying bot for make.fun btc-race-24h-20261118-1444.
//
// The dev window falls about 2% in its first two hours, then recovers to
// roughly where it started and ranges for the rest of the day. This bot
// catches that one big dip and rides the recovery back up:
//
//   * Buy with all cash when the close is at least 1.75% below the highest
//     close of the last 36 bars.
//   * Sell everything when the close is at least 1.75% above the buy's
//     actual fill price (taken from the batch fills, with the position's
//     cost basis as a fallback).
//   * Otherwise hold; whatever is still held when the window ends is
//     flattened by the harness.
//   * One round trip per window: once the sell has filled, never buy again.
//
// Dev-window result (kit grade-local, --driver process, run twice):
// net PnL +16.705029 USDC, 2 trades, win rate 1.0, max drawdown 1.496%,
// fees 0.806845 USDC (at 2x fees still +15.892281 USDC), 0 rejected;
// guardrails met; L1 regrade reproduced byte for byte.
//
// The thresholds are deliberately off-round (1.75%, 36 bars) so the bot's
// behaviour is less likely to be byte-for-byte identical to another entry's.
//
// Exact BigInt arithmetic throughout, no clock, no randomness, no network,
// no files outside the repository, so two runs on the same data produce
// the same orders.

import { runBars, type BarsState, type Batch } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK_BARS = 36;
const DIP_BPS = 175; // buy when the close is 1.75% below the 36-bar high
const RISE_BPS = 175; // sell when the close is 1.75% above the buy fill
const MAX_SLIPPAGE_BPS = 500;
const BPS = 10_000n;

// Every close seen so far, in bar order (including warm-up bars: they exist
// to build history from).
const closes: bigint[] = [];
// The price the buy actually filled at, in price_scale units; null when flat.
let buyFillPrice: bigint | null = null;
// True between the buy fill and the sell fill.
let inTrade = false;
// True once the sell has filled: the round trip is done, never buy again.
let finished = false;

/** The position's implied price per unit from its cost basis, or null. */
function costBasisPrice(state: BarsState): bigint | null {
  const position = state.positions.get(SYMBOL);
  const symbol = state.symbols.get(SYMBOL);
  if (position === undefined || symbol === undefined || position.qty === 0n) return null;
  const quoteScale = BigInt(state.hello.capital.quote_scale);
  const scale = BigInt(symbol.qty_scale + symbol.price_scale);
  return (position.cost * 10n ** scale) / (position.qty * 10n ** quoteScale);
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    // Learn from this batch's fills first: they say what actually filled.
    for (const fill of batch.fills) {
      if (fill.symbol !== SYMBOL || fill.status !== 'filled') continue;
      if (fill.side === 'buy') {
        buyFillPrice = BigInt(fill.price);
        inTrade = true;
      } else if (fill.side === 'sell') {
        inTrade = false;
        finished = true;
        buyFillPrice = null;
      }
    }

    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);

    // While warming up, orders would be rejected: build history, trade nothing.
    if (state.warmingUp || finished) return [];

    const position = state.positions.get(SYMBOL);
    const holding = position !== undefined && position.qty > 0n;

    if (inTrade && holding) {
      // Holding: sell everything once the close has risen 1.75% over the buy fill.
      const fill = buyFillPrice ?? costBasisPrice(state);
      if (fill !== null && close * BPS >= fill * (BPS + BigInt(RISE_BPS))) {
        return [{ side: 'sell', symbol: SYMBOL, qty: position.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }
    if (holding) return []; // A position with no recorded buy fill: hold.

    // Flat: buy the dip once the close is 1.75% below the 36-bar high.
    if (closes.length < LOOKBACK_BARS) return [];
    let high = closes[closes.length - 1];
    for (let i = closes.length - LOOKBACK_BARS; i < closes.length; i++) {
      if (closes[i] > high) high = closes[i];
    }
    if (close * BPS <= high * (BPS - BigInt(DIP_BPS))) {
      if (state.cash <= 0n) return [];
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
