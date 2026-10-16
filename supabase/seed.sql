-- Medix v0 demo seed. Run after schema.sql. Demo data only.
-- Logins (username / password), all with password  Medix2026!
--   dr.cohen   doctor
--   secretary  staff
--   dana, avi, rina, moshe, tamar, eli   patients
-- Usernames are stored in Supabase Auth as <username>@medix.local

do $$
declare
  v_clinic uuid := gen_random_uuid();
  v_tpl uuid := gen_random_uuid();
  v_pw text := 'Medix2026!';
  u record;
  v_uid uuid;
  v_pid uuid;
  v_journey uuid;
  r record;
begin
  insert into clinics (id, name) values (v_clinic, 'מרפאה לדוגמה');

  -- ---------- auth users + profiles
  for u in
    select * from (values
      ('dr.cohen',  'ד״ר אלון כהן',  'doctor'),
      ('secretary', 'מיכל לוי',       'staff'),
      ('dana',      'דנה אברהם',      'patient'),
      ('avi',       'אבי מזרחי',      'patient'),
      ('rina',      'רינה שלום',      'patient'),
      ('moshe',     'משה פרידמן',     'patient'),
      ('tamar',     'תמר גולן',       'patient'),
      ('eli',       'אלי בן דוד',     'patient')
    ) as t(username, full_name, role)
  loop
    v_uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      u.username || '@medix.local', crypt(v_pw, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', u.username || '@medix.local'), 'email', now(), now(), now());
    insert into profiles (id, clinic_id, role, full_name) values (v_uid, v_clinic, u.role::user_role, u.full_name);
    if u.role = 'patient' then
      insert into patients (clinic_id, user_id, full_name, phone)
      values (v_clinic, v_uid, u.full_name, '050-' || lpad((floor(random() * 9000000) + 1000000)::text, 7, '0'));
    end if;
  end loop;

  -- ---------- baseline template (mock content, to be replaced by the real protocol)
  insert into templates (id, clinic_id, name, procedure, description)
  values (v_tpl, v_clinic, 'החלפת ברך – תבנית בסיס', 'החלפת מפרק ברך',
          'מסלול הכנה ומעקב לדוגמה. התוכן הוא נתוני דמו בלבד.');

  create temp table _t (key text, title text, descr text, owner text, off int, ev boolean, rev boolean,
                        mand boolean, pos int, deps text[], id uuid default gen_random_uuid()) on commit drop;
  insert into _t (key, title, descr, owner, off, ev, rev, mand, pos, deps) values
   ('consult',  'פגישת ייעוץ והחלטה על ניתוח', 'הרופא והמטופל מסכמים על ניתוח להחלפת ברך ועל מועד משוער.', 'staff', 60, false, false, true, 0, '{}'),
   ('blood',    'בדיקות דם', 'ספירת דם, כימיה, קרישה וסוכר. אפשר לבצע בקופת החולים או במעבדה פרטית. יש להעלות את התוצאות.', 'patient', 21, true, true, true, 1, '{consult}'),
   ('ecg',      'אק״ג', 'בדיקת אק״ג במנוחה. יש להעלות את התוצאה.', 'patient', 21, true, true, true, 2, '{consult}'),
   ('xray',     'צילום חזה', 'צילום חזה מהחודשיים האחרונים. יש להעלות את התוצאה.', 'patient', 21, true, true, true, 3, '{consult}'),
   ('insurance','אישור קופה או ביטוח (טופס 17)', 'קבלת אישור למימון הניתוח. יש להעלות את האישור לאחר שהתקבל.', 'patient', 14, true, true, true, 4, '{consult}'),
   ('prehab',   'תרגילי חיזוק לפני הניתוח', 'סדרת תרגילים קצרה מדי יום, כפי שהודרכת. סמן/י כשסיימת את התוכנית.', 'patient', 14, false, false, false, 5, '{consult}'),
   ('review',   'בדיקת הצוות את תוצאות הבדיקות', 'האחות עוברת על הבדיקות ומאשרת שאין חריגות.', 'staff', 14, false, false, true, 6, '{blood,ecg,xray}'),
   ('anesth',   'הערכת רופא מרדים / קרדיולוג', 'פגישה עם רופא מרדים או קרדיולוג. יש להעלות את מכתב הסיכום.', 'patient', 10, true, true, true, 7, '{ecg,review}'),
   ('meds',     'סקירת תרופות והנחיות להפסקת מדללי דם', 'הצוות עובר על התרופות הקבועות ונותן הנחיות מדויקות.', 'staff', 7, false, false, true, 8, '{review}'),
   ('home',     'הכנת הבית להחלמה', 'להסיר שטיחים, להכין כיסא גבוה ולסדר מקום להליכון. סמן/י כשהכול מוכן.', 'patient', 7, false, false, true, 9, '{consult}'),
   ('signoff',  'אישור סופי לניתוח', 'הרופא מאשר שהמטופל מוכן לניתוח.', 'doctor', 3, false, false, true, 10, '{insurance,anesth,meds,review}'),
   ('fasting',  'הוראות צום והגעה', 'צום החל מחצות. להגיע לבית החולים בשעה שנקבעה. סמן/י שקראת והבנת.', 'patient', 1, false, false, true, 11, '{signoff}'),
   ('follow2',  'ביקורת שבועיים לאחר הניתוח', 'בדיקת פצע והסרת תפרים.', 'staff', -14, false, false, true, 12, '{}'),
   ('follow6',  'ביקורת שישה שבועות לאחר הניתוח', 'בדיקת טווח תנועה והתקדמות בפיזיותרפיה.', 'staff', -42, false, false, true, 13, '{}');

  insert into template_tasks (id, template_id, clinic_id, title, description, owner, due_offset_days,
    requires_evidence, requires_review, mandatory, position)
  select id, v_tpl, v_clinic, title, descr, owner, off, ev, rev, mand, pos from _t;

  update template_tasks tt
  set depends_on = coalesce((select array_agg(d.id) from _t d where d.key = any(x.deps)), '{}')
  from _t x where x.id = tt.id;

  -- ---------- patient journeys at different stages
  -- (username, days to surgery, accepted keys, submitted keys, rejected keys)
  for r in
    select * from (values
      ('dana',  40, '{consult}',                                                                                      '{}',          '{}'),
      ('avi',   18, '{consult,blood}',                                                                                '{ecg}',       '{}'),
      ('rina',   9, '{consult,blood,ecg,xray,review,insurance,prehab}',                                              '{anesth}',    '{}'),
      ('moshe',  3, '{consult,blood,ecg,xray,review,insurance,prehab,anesth,meds,home}',                              '{}',          '{}'),
      ('tamar',  5, '{consult,blood,ecg,xray,review,prehab,anesth,meds,home}',                                        '{}',          '{insurance}'),
      ('eli',   14, '{consult,blood,ecg,xray,review,insurance,prehab,anesth,meds,home,signoff,fasting}',              '{}',          '{}')
    ) as t(username, days, accepted, submitted, rejected)
  loop
    select p.id into v_pid from patients p join auth.users a on a.id = p.user_id
      where a.email = r.username || '@medix.local';
    v_journey := _start_journey(v_pid, v_tpl, (current_date + r.days));

    update journey_tasks jt set status = 'accepted', reviewed_at = now()
    from template_tasks tt join _t x on x.id = tt.id
    where jt.journey_id = v_journey and jt.template_task_id = tt.id and x.key = any(r.accepted::text[]);

    update journey_tasks jt set status = 'submitted', submitted_at = now() - interval '1 day'
    from template_tasks tt join _t x on x.id = tt.id
    where jt.journey_id = v_journey and jt.template_task_id = tt.id and x.key = any(r.submitted::text[]);

    update journey_tasks jt set status = 'rejected', submitted_at = now() - interval '2 days', reviewed_at = now() - interval '1 day',
      review_note = 'המסמך לא קריא. נא להעלות סריקה ברורה יותר.'
    from template_tasks tt join _t x on x.id = tt.id
    where jt.journey_id = v_journey and jt.template_task_id = tt.id and x.key = any(r.rejected::text[]);
  end loop;
end $$;
