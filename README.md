# Dip Rider — BTC trading bot

[![make.fun](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Kroco365/btc-race-1118/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Kroco365/btc-race-1118/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)

An entry for the [make.fun bounty "Race a BTC trading bot live for 24 hours"](https://make.fun/bounty/btc-race-24h-20261118-1444): a bot that trades Coinbase Wrapped BTC (cbBTC) against USDC, minute by minute, starting with 1,000 USDC of paper money in a replay of on-chain prices.

## Strategy

A dip-buying mean-reversion bot, built for a window that trends down overall (the dev window falls 2.8% open to close, so buy-and-hold loses about $31.63):

- **Entry:** while flat, buy with all cash when the latest close is at least **1.75% below the highest close of the last 36 bars** — a sharp dip off the recent high.
- **Exit:** while holding, sell the whole position when the latest close is at least **1.75% above the price the buy actually filled at** — sell the bounce.
- **Otherwise hold.** Anything still held at the end of the window is flattened by the harness.

The thresholds are deliberately a little off the round numbers (1.75% rather than 2%): on the dev window the entry signal fires on 10 bars, and the one trade it takes buys the early ~2% drop and sells the recovery near the day's high. There is no stop-loss and no time exit — the bounce target, not a clock, decides the exit, and the end-of-window flatten bounds the worst case.

## Implementation

`main.ts` is the whole bot, written in TypeScript against the kit SDK (`vendor/makefun-bars.ts`, copied byte-identical from the competition kit). It is fully deterministic: exact integer arithmetic (BigInt comparisons in basis points), no clock, no randomness, no network. The same bars always produce the same orders. The exit compares against the buy's actual fill price, taken from the batch's fills (falling back to the position's cost basis if a fill is ever missed).

## Dev-window results (kit `grade-local`, driver process, worktree)

- Net PnL: **+16.705029 USDC** on the 1,440-bar dev window (1 buy + 1 sell)
- Trades: 2 (one round trip: buy the early dip, sell the recovery; win rate 1.0)
- Max drawdown: 1.496%
- Fees: 0.806845 USDC
- Guardrails: met (trades ok, symbols ok, drawdown ok); L1 regrade reproduced byte for byte (deterministic)
- action_log_sha256: `c0e79ca41dade1a54e48b7b5f2d45e6f187eb7ef1e70aaca193263e51b6fe3c7`
- result_sha256: `8174cd88beb1f0096cfb658d008505949e71cb46413675ea4fc215b319b81164` (regrade after final comment edit; action log unchanged)

Buy-and-hold on the same window loses $31.63, and the previous race's winning style (buy early, hold to the end) loses here too — the dip-and-bounce is what clears the dev gate (net PnL > $0, max drawdown ≤ 25%).

## Run it

```sh
node cli/makefun.mjs grade-local --repo . --worktree
```

## License

MIT — see [LICENSE](LICENSE).
