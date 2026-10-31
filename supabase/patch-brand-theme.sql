-- Two more brand colors per clinic, next to brand_color (the accent used for links and highlights):
--   brand_dark: the deep color of the top bar, bottom bar and the hero on the patient's first screen
--   brand_gold: the highlight color (primary buttons, the selected tab)
-- Optional: a clinic with only brand_color keeps the lighter look. Safe to re-run.
alter table clinics add column if not exists brand_dark text;
alter table clinics add column if not exists brand_gold text;

do $$ begin
  alter table clinics add constraint clinics_brand_dark_check check (brand_dark is null or brand_dark ~ '^#[0-9a-fA-F]{6}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table clinics add constraint clinics_brand_gold_check check (brand_gold is null or brand_gold ~ '^#[0-9a-fA-F]{6}$');
exception when duplicate_object then null; end $$;
