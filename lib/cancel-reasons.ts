// Not in a "use server" file: Next.js only allows async functions to be exported from those.
export const CANCEL_REASONS = ["patient_request", "medical", "insurance", "clinic_schedule", "other"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];
