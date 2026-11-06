"use client";

// A small local mutation queue (IndexedDB) for the two actions explicitly scoped as safe to run
// without a live connection: a patient marking a task done (with an optional file), and staff
// marking a task done. Everything else (cancellations, reject/reopen, clinical notes, journey
// edits...) stays online-only by design — those have real conflict risk between staff members, so
// they fail loudly instead of silently queuing. See supabase/patch-* comments for the matching
// server-side guards (RLS + guard_patient_task_update) that make even these two safe to replay.
import { createClient } from "@/lib/supabase/client";
import { setOptimisticState } from "@/components/task-optimistic";

const DB_NAME = "medix-offline";
const DB_VERSION = 1;
const STORE = "pending_mutations";

export type QueuedMutation = {
  id?: number;
  kind: "patient_submit" | "staff_accept";
  taskId: string;
  journeyId?: string;
  note?: string;
  fileBlob?: Blob;
  fileName?: string;
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueue(m: Omit<QueuedMutation, "id">): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(m);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll(): Promise<QueuedMutation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedMutation[]);
    req.onerror = () => reject(req.error);
  });
}

async function remove(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const listeners = new Set<() => void>();
export function onQueueChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const notify = () => listeners.forEach((l) => l());

// Runs one mutation for real. `permanent: true` means don't retry — the request reached the
// server and was rejected (task already handled, no longer open, etc.), not a network failure.
async function runMutation(supabase: ReturnType<typeof createClient>, m: QueuedMutation): Promise<{ ok: boolean; permanent?: boolean }> {
  try {
    if (m.kind === "patient_submit") {
      let evidence_path: string | null = null;
      let evidence_name: string | null = null;
      if (m.fileBlob && m.fileName) {
        if (!m.journeyId) return { ok: false, permanent: true };
        const ext = (m.fileName.split(".").pop() ?? "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
        // evidence_access() (schema.sql) authorizes by the path's first segment, which it expects
        // to be the journey id, not the task id — must match that or every upload/read gets rejected.
        const path = `${m.journeyId}/${m.taskId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("evidence").upload(path, m.fileBlob, { contentType: m.fileBlob.type || undefined });
        if (upErr) return { ok: false };
        evidence_path = path;
        evidence_name = m.fileName;
      }
      const { data: task } = await supabase.from("journey_tasks").select("requires_evidence, requires_review").eq("id", m.taskId).maybeSingle();
      if (!task) return { ok: false, permanent: true };
      const needsReview = task.requires_evidence || task.requires_review;
      const { error } = await supabase
        .from("journey_tasks")
        .update({
          status: needsReview ? "submitted" : "accepted",
          evidence_path, evidence_name,
          patient_note: m.note?.trim() || null,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", m.taskId);
      return error ? { ok: false, permanent: true } : { ok: true };
    }
    if (m.kind === "staff_accept") {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { ok: false };
      const { error } = await supabase
        .from("journey_tasks")
        .update({ status: "accepted", review_note: null, reviewed_at: new Date().toISOString(), reviewed_by: auth.user.id })
        .eq("id", m.taskId);
      return error ? { ok: false, permanent: true } : { ok: true };
    }
    return { ok: true };
  } catch {
    // A thrown error here is a genuine network failure (fetch couldn't even complete) — retry later.
    return { ok: false };
  }
}

// Attempts every queued mutation once, in order. Leaves network failures queued for next time;
// drops ones the server actively rejected, after telling the caller which task that was.
export async function flushQueue(onFailed?: (taskId: string) => void): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  const supabase = createClient();
  const pending = await getAll();
  for (const m of pending) {
    const result = await runMutation(supabase, m);
    if (result.ok) {
      await remove(m.id!);
      setOptimisticState(m.taskId, null);
    } else if (result.permanent) {
      await remove(m.id!);
      setOptimisticState(m.taskId, null);
      onFailed?.(m.taskId);
    }
  }
  notify();
}

// The single entry point UI calls: runs immediately when online, queues silently when not (or if
// the live attempt itself fails on a network error mid-flight).
export async function queueOrRun(m: Omit<QueuedMutation, "id" | "createdAt">): Promise<{ queued: boolean; rejected?: boolean }> {
  const online = typeof navigator === "undefined" || navigator.onLine;
  if (online) {
    const supabase = createClient();
    const result = await runMutation(supabase, { ...m, createdAt: Date.now() });
    if (result.ok) return { queued: false };
    if (result.permanent) return { queued: false, rejected: true };
  }
  await enqueue({ ...m, createdAt: Date.now() });
  notify();
  return { queued: true };
}

export async function pendingCount(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  return (await getAll()).length;
}
