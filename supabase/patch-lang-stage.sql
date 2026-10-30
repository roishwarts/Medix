-- Patient language (for WhatsApp / email messages) and a manual status override. Safe to re-run.
-- The language is saved when the patient changes it in the app, or chosen by staff when the patient is created.
-- stage_override: when set, it replaces the status worked out from the journey.
alter table patients add column if not exists lang text not null default 'he' check (lang in ('he', 'en', 'ru', 'ar'));
alter table patients add column if not exists stage_override text check (stage_override in ('decided', 'preparing', 'ready', 'recovering', 'finished'));
