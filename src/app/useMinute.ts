/**
 * src/app/useMinute.ts: the current time, refreshed on each minute boundary.
 *
 * Layer: UI. Due labels, OVERDUE marks and the planning views depend on the
 * time; one shared timer per subscriber, aligned to the minute.
 */
import { useEffect, useState } from 'react';

/** Epoch ms of now, re-rendering the caller once a minute. */
export function useMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    return () => clearTimeout(timer);
  }, []);
  return now;
}
