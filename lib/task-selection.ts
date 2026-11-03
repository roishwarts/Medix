"use client";

// A tiny external store (same pattern as components/task-optimistic.tsx and components/toast.tsx)
// for multi-selecting tasks on the /clinic/tasks queue, so a bulk-accept bar can live outside the
// row tree without prop-drilling selection state through every section.
const selected = new Set<string>();
let bulkPending = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeSelection(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function toggleTaskSelected(id: string): void {
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  emit();
}

export function isTaskSelected(id: string): boolean {
  return selected.has(id);
}

export function selectedTaskIds(): string[] {
  return [...selected];
}

export function selectionSize(): number {
  return selected.size;
}

export function deselectTask(id: string): void {
  if (!selected.has(id)) return;
  selected.delete(id);
  emit();
}

export function clearSelection(): void {
  if (selected.size === 0) return;
  selected.clear();
  emit();
}

export function setBulkPending(value: boolean): void {
  bulkPending = value;
  emit();
}

export function isBulkPending(): boolean {
  return bulkPending;
}
