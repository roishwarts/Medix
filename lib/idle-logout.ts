"use client";

// A signed-in device nobody touches for hours signs itself out automatically - a tablet left on a
// desk in the clinic shouldn't keep a patient's record open indefinitely. A minute before, a
// warning appears ("still here?"); any touch/tap keeps the session alive. Never signs out while a
// mutation is still waiting in the offline queue - that would lose it.
import { useEffect, useRef, useState } from "react";
import { pendingCount } from "./offline/queue";

const KEY = "medix.lastActive";
export const IDLE_HOURS = 4;
const WARN_MS = 60_000;

const read = (): number => {
  try {
    return Number(localStorage.getItem(KEY)) || Date.now();
  } catch {
    return Date.now();
  }
};
const write = () => {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // No storage access (private mode) - idle tracking just won't persist across reloads.
  }
};

// `warning` is the number of seconds left while the "still here?" question is shown (0 = hidden).
export function useIdleLogout(enabled: boolean, onExpire: () => void): { warning: number; stay: () => void } {
  const [warning, setWarning] = useState(0);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    if (!enabled) return;
    write();
    let last = 0;
    const touch = () => {
      const now = Date.now();
      if (now - last < 5000) return; // writing on every scroll/move tick is wasteful
      last = now;
      write();
      setWarning(0);
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const limit = IDLE_HOURS * 3_600_000;
    const tick = window.setInterval(async () => {
      const idle = Date.now() - read();
      if (idle < limit) return;
      if ((await pendingCount()) > 0) return;
      if (idle >= limit + WARN_MS) expire.current();
      else setWarning(Math.max(1, Math.ceil((limit + WARN_MS - idle) / 1000)));
    }, 5000);
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - read() < limit + WARN_MS) return;
      if ((await pendingCount()) > 0) return;
      expire.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return { warning, stay: () => { write(); setWarning(0); } };
}
