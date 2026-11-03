"use client";

import { useEffect, useSyncExternalStore } from "react";

// A minimal, dependency-free toast: one message at a time, auto-dismissing. Same external-store
// pattern as task-optimistic.tsx, so it works from anywhere (including outside React, like the
// offline queue's flush callback) without prop-drilling a setter.
let current: { id: number; message: string } | null = null;
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string) {
  current = { id: ++nextId, message };
  emit();
}

export function Toaster() {
  const value = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
    () => null,
  );

  useEffect(() => {
    if (!value) return;
    const id = value.id;
    const timer = setTimeout(() => { if (current?.id === id) { current = null; emit(); } }, 6000);
    return () => clearTimeout(timer);
  }, [value]);

  if (!value) return null;
  return (
    <div className="fixed inset-x-4 bottom-20 z-[80] mx-auto max-w-md md:bottom-6" role="status" aria-live="polite">
      <div className="card flex items-start justify-between gap-3 border-warn/25 bg-warn-soft px-4 py-3 text-sm shadow-lg">
        <p className="min-w-0 break-words">{value.message}</p>
        <button type="button" className="shrink-0 text-xs text-muted hover:underline" onClick={() => { current = null; emit(); }}>✕</button>
      </div>
    </div>
  );
}
