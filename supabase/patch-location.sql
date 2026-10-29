-- The clinic's street address, shown to patients on appointments at the clinic (with navigation links).
-- Safe to re-run. The admin sets it on the clinic page.
alter table clinics add column if not exists address text;
