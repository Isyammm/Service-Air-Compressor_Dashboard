// Target one request start per second. Slow responses skip missed ticks;
// requests are never overlapped or replayed as a catch-up burst.
export const LIVE_POLL_INTERVAL_MS = 1000
export function nextPollDelay(startedAt: number, finishedAt: number): number {
  const elapsed = Math.max(0, finishedAt - startedAt)
  const nextTick = (Math.floor(elapsed / LIVE_POLL_INTERVAL_MS) + 1) * LIVE_POLL_INTERVAL_MS
  return nextTick - elapsed
}
