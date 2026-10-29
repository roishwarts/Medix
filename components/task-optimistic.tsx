"use client";

import { useSyncExternalStore } from "react";
import { TaskStatePill } from "@/components/ui";
import type { TaskState } from "@/lib/journey";

// Shows the result of a button press at once, while the server saves it and re-renders the page.
// The entry is dropped as soon as the real state arrives (or the save fails).
const states = new Map<string, TaskState>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function setOptimisticState(taskId: string, state: TaskState | null) {
  if (state) states.set(taskId, state);
  else states.delete(taskId);
  emit();
}

export function useTaskState(taskId: string, serverState: TaskState): TaskState {
  const optimistic = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => states.get(taskId) ?? null,
    () => null,
  );
  return optimistic ?? serverState;
}

export function LiveTaskPill({ taskId, state, overdue }: { taskId: string; state: TaskState; overdue: boolean }) {
  const shown = useTaskState(taskId, state);
  return <TaskStatePill state={shown} overdue={shown === state ? overdue : false} />;
}
