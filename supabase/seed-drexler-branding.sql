-- Branding for "מרפאת פרופסור דרקסלר", applied to the clinic that Prof. Drexler and Meital belong to
-- (found through their users), not to "the first clinic". Safe to re-run.

-- Step 1: undo the branding that earlier landed on the example clinic (the one with מיכל לוי and ד״ר אלון כהן).
update clinics set
  name = 'מרפאה לדוגמה',
  brand_color = null,
  logo_path = null,
  contact_name = null,
  contact_role = null,
  contact_phone = null,
  office_hours = null
where id in (select clinic_id from profiles where full_name ilike '%מיכל לוי%' or full_name ilike '%אלון כהן%')
  and name = 'מרפאת פרופסור דרקסלר'
  and id not in (select clinic_id from profiles where full_name ilike '%דרקסלר%' or full_name ilike '%מיטל%');

delete from clinic_options
where kind = 'hospital'
  and name in ('בית חולים רפאל', 'הרצליה מדיקל סנטר', 'אשדוד', 'אשקלון')
  and clinic_id in (select clinic_id from profiles where full_name ilike '%מיכל לוי%' or full_name ilike '%אלון כהן%')
  and clinic_id not in (select clinic_id from profiles where full_name ilike '%דרקסלר%' or full_name ilike '%מיטל%');

-- Step 2: brand the real clinic. Stops with an error if the two users are not in exactly one clinic.
do $$
declare
  v_n int;
  v_id uuid;
begin
  select count(distinct clinic_id), (array_agg(distinct clinic_id))[1]
    into v_n, v_id
  from profiles
  where full_name ilike '%דרקסלר%' or full_name ilike '%מיטל%';

  if v_n <> 1 then
    raise exception 'Expected exactly one clinic for the users Drexler and Meital, found %', v_n;
  end if;

  update clinics set
    name = 'מרפאת פרופסור דרקסלר',
    brand_color = '#1863dc',
    logo_path = 'https://drexlerclinic.co.il/wp-content/uploads/2022/04/logo-03.png',
    contact_name = 'משרד פרופ׳ דרקסלר',
    contact_role = 'תיאום תורים ושאלות',
    contact_phone = '050-4378437',
    office_hours = 'א׳–ה׳ 9:00–19:00 · שישי ושבת סגור',
    address = 'החושלים 8, הרצליה (קומה 2)'
  where id = v_id;

  insert into clinic_options (clinic_id, kind, name)
  select v_id, 'hospital', h.name
  from (values ('בית חולים רפאל'), ('הרצליה מדיקל סנטר'), ('אשדוד'), ('אשקלון')) as h(name)
  on conflict (clinic_id, kind, name) do nothing;
end $$;

-- Check: which clinic each user belongs to now.
select p.full_name, c.name as clinic, c.logo_path is not null as has_logo
from profiles p join clinics c on c.id = p.clinic_id
where p.role in ('doctor', 'staff')
order by c.name, p.full_name;
