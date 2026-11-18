# Dip Rider — BTC dip-buying bot

[![make.fun](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Kroco365/btc-race-1118/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Kroco365/btc-race-1118/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)

A trading bot for the [make.fun bounty "Race a BTC trading bot live for 24 hours"](https://make.fun/bounty/btc-race-24h-20261118-1444) ($250 prize pool). It trades Coinbase Wrapped BTC (cbBTC) against USDC, minute by minute, starting with 1,000 USDC of paper money. Nothing is traded for real.

## Strategy

The dev window falls about 2% in its first two hours, then recovers to roughly where it started and ranges for the rest of the day. Dip Rider catches that one big dip and rides the recovery back up:

- **Buy** with all cash when the close is at least **1.75% below the highest close of the last 36 bars**.
- **Sell** everything when the close is at least **1.75% above the buy's actual fill price** (taken from the batch fills, with the position's cost basis as a fallback).
- Otherwise hold; whatever is still held when the window ends is flattened by the harness.
- **One round trip per window**: once the sell has filled, the bot never buys again.

The thresholds are deliberately off-round (1.75%, 36 bars) to reduce the chance of byte-for-byte identical behaviour with another entry. The bot uses exact BigInt arithmetic throughout, with no clock, no randomness, no network access, and no files outside the repository — so two runs on the same data produce the same orders.

## Dev-window result

Measured with the kit's local grader (`grade-local --kit . --bot . --driver process`, run twice):

- **Net PnL: +16.705029 USDC** (return +1.67%)
- **Trades: 2** (one round trip, win rate 1.0)
- **Max drawdown: 1.496%** (guardrail: ≤ 25%)
- **Fees: 0.806845 USDC** (at 2× fees, net PnL is still +15.892281 USDC)
- **0 rejected orders**; L1 regrade reproduced byte for byte

The bot only races if this dev grade stays above $0, and it is ranked by its net PnL on the unseen 24-hour race window — so the dev profit is a gate, not a promise: one dip-ride in the dev window does not guarantee a dip in the race window.

## Files

- `main.ts` — the bot (Node 22, runs as `node /bot/main.ts`)
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's bars-replay SDK shim
- `LICENSE` — MIT
- `.makefun/owner.json` — the wallet this entry is claimed with

## License

MIT — see [LICENSE](LICENSE).
