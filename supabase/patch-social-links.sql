-- Social links shown to patients (Facebook, Instagram, YouTube), one set per clinic.
-- Safe to re-run.
alter table clinics add column if not exists social_facebook text;
alter table clinics add column if not exists social_instagram text;
alter table clinics add column if not exists social_youtube text;

create or replace function save_clinic_social_links(p_facebook text, p_instagram text, p_youtube text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update clinics set
    social_facebook = nullif(trim(p_facebook), ''),
    social_instagram = nullif(trim(p_instagram), ''),
    social_youtube = nullif(trim(p_youtube), '')
  where id = auth_clinic();
end $$;

revoke execute on function save_clinic_social_links(text, text, text) from public, anon;

-- Prof. Drexler's clinic (only where not already set).
update clinics set
  social_facebook = 'https://www.facebook.com/drexlerclinic/',
  social_instagram = 'https://www.instagram.com/prof.drexler',
  social_youtube = 'https://www.youtube.com/channel/UCcT61HIwu4fJISfgWZytwnw/videos?view_as=subscriber'
where name like '%דרקסלר%' and social_facebook is null and social_instagram is null and social_youtube is null;

-- Records that this patch ran, for _migrations-table.sql's applied-patches query.
insert into _migrations (name) values ('patch-social-links.sql') on conflict (name) do nothing;
