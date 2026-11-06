-- Defense in depth: the 10MB size cap and image/PDF type restriction on patient evidence uploads
-- were previously enforced only client-side (app/(patient)/journey/tasks/[id]/submit-panel.tsx),
-- which is trivially bypassed by calling the Storage API directly. Enforce the same limits at the
-- bucket level too. Safe to re-run.
update storage.buckets
set file_size_limit = 10485760, -- 10MB, matches MAX_BYTES in submit-panel.tsx
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
where id = 'evidence';

-- Records that this patch ran, for _migrations-table.sql's applied-patches query.
insert into _migrations (name) values ('patch-evidence-bucket-limits.sql') on conflict (name) do nothing;
