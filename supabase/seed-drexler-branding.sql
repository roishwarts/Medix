-- Branding for "מרפאת פרופסור דרקסלר". If you have several clinics, change the WHERE of the first statement
-- to the clinic's name (for example: where name = 'מרפאה לדוגמה'), and use the same clinic in the second one.
update clinics set
  name = 'מרפאת פרופסור דרקסלר',
  brand_color = '#1863dc',
  logo_path = 'https://drexlerclinic.co.il/wp-content/uploads/2022/04/logo-03.png',
  contact_name = 'משרד פרופ׳ דרקסלר',
  contact_role = 'תיאום תורים ושאלות',
  contact_phone = '050-4378437',
  office_hours = 'א׳–ה׳ 9:00–19:00 · שישי ושבת סגור',
  address = 'החושלים 8, הרצליה (קומה 2)'
where id = (select id from clinics order by created_at limit 1);

insert into clinic_options (clinic_id, kind, name)
select c.id, 'hospital', h.name
from (select id from clinics order by created_at limit 1) c,
     (values ('בית חולים רפאל'), ('הרצליה מדיקל סנטר'), ('אשדוד'), ('אשקלון')) as h(name)
on conflict (clinic_id, kind, name) do nothing;
