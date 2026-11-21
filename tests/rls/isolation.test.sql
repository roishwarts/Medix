-- Row-level-security tests: two clinics (A and B) must never see or change each other's data, a patient only
-- sees their own journey, and the anonymous role sees nothing. Run by tests/rls/run.sh on a database built from
-- supabase/schema.sql + every patch. Any failed check makes the script exit non-zero.
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------- seed (as superuser)
create schema rls_t;
create table rls_t.ids (k text primary key, v uuid not null);
create table rls_t.fails (msg text);
create function rls_t.id(k text) returns uuid language sql stable as $$ select v from rls_t.ids where ids.k = $1 $$;

do $$
declare
  ca uuid := gen_random_uuid(); cb uuid := gen_random_uuid();
  u record; tpl uuid; pat uuid; j uuid;
begin
  insert into clinics (id, name) values (ca, 'Clinic A'), (cb, 'Clinic B');
  insert into rls_t.ids values ('clinicA', ca), ('clinicB', cb);

  -- users and profiles: doctor, staff, patient(s) per clinic
  for u in select * from (values
    ('docA','doctor',ca), ('staffA','staff',ca), ('patA1','patient',ca), ('patA2','patient',ca),
    ('docB','doctor',cb), ('staffB','staff',cb), ('patB1','patient',cb)) v(k, r, c)
  loop
    insert into rls_t.ids values ('u_' || u.k, gen_random_uuid());
    insert into auth.users (id, email) values (rls_t.id('u_' || u.k), u.k || '@test.local');
    insert into profiles (id, clinic_id, role, full_name) values (rls_t.id('u_' || u.k), u.c, u.r::user_role, u.k);
  end loop;

  -- a template with two tasks, a patient row and a journey per patient
  for u in select * from (values ('A1', ca, 'patA1'), ('A2', ca, 'patA2'), ('B1', cb, 'patB1')) v(k, c, usr) loop
    tpl := gen_random_uuid();
    insert into templates (id, clinic_id, name, procedure) values (tpl, u.c, 'T-' || u.k, 'proc');
    insert into template_tasks (template_id, clinic_id, title, owner, requires_evidence, requires_review)
      values (tpl, u.c, 'Task 1 ' || u.k, 'patient', true, true), (tpl, u.c, 'Task 2 ' || u.k, 'staff', false, false);
    pat := gen_random_uuid();
    insert into patients (id, clinic_id, user_id, full_name, phone) values (pat, u.c, rls_t.id('u_' || u.usr), 'Pat ' || u.k, '0500000000');
    j := _start_journey(pat, tpl, current_date + 10);
    insert into rls_t.ids values ('tpl' || u.k, tpl), ('pat' || u.k, pat), ('j' || u.k, j);
  end loop;

  -- one row for clinic B in every other clinic-scoped table (so "A sees none of B's rows" is never vacuous)
  insert into clinic_links (clinic_id, label, url) values (cb, 'l', 'https://x.test');
  insert into clinic_options (clinic_id, kind, name) values (cb, 'hospital', 'H');
  insert into clinic_videos (clinic_id, title, phase, storage_path) values (cb, 'v', 'before', 'p/v.mp4');
  insert into activity_events (clinic_id, kind) values (cb, 'x');
  insert into doctor_questions (clinic_id, patient_id, question) values (cb, rls_t.id('patB1'), 'q?');
  insert into clinical_summaries (journey_id, clinic_id) values (rls_t.id('jB1'), cb);
  insert into referrals (patient_id, clinic_id, doctor_id, doctor_name, recipient, reason)
    values (rls_t.id('patB1'), cb, rls_t.id('u_docB'), 'docB', 'r', 'why');
  insert into visit_notes (patient_id, clinic_id, author_id, note) values (rls_t.id('patB1'), cb, rls_t.id('u_staffB'), 'n');
  insert into patient_caregivers (clinic_id, patient_id, user_id, full_name, relation)
    values (cb, rls_t.id('patB1'), rls_t.id('u_staffB'), 'cg', 'sibling');
  insert into caregiver_invites (clinic_id, patient_id, created_by, relation, token_hash, expires_at)
    values (cb, rls_t.id('patB1'), rls_t.id('u_staffB'), 'sibling', 'h1', now() + interval '1 day');
  insert into account_links (clinic_id, purpose, created_by, token_hash, expires_at)
    values (cb, 'patient_join', rls_t.id('u_staffB'), 'h2', now() + interval '1 day');
  insert into password_reset_requests (clinic_id, user_id, full_name, role)
    values (cb, rls_t.id('u_patB1'), 'x', 'patient');
  insert into proms_responses (journey_task_id, journey_id, patient_id, clinic_id, instrument, timepoint, answers)
    select jt.id, jt.journey_id, rls_t.id('patB1'), cb, 'oks', 'baseline', '{}'::jsonb from journey_tasks jt where jt.journey_id = rls_t.id('jB1') limit 1;

  -- storage objects: evidence is addressed by journey id, referral results by referral id
  insert into storage.buckets (id, name) values ('evidence', 'evidence'), ('referral-results', 'referral-results') on conflict do nothing;
  insert into storage.objects (bucket_id, name) values
    ('evidence', rls_t.id('jA1') || '/file.pdf'), ('evidence', rls_t.id('jB1') || '/file.pdf'),
    ('referral-results', (select id from referrals where clinic_id = cb limit 1) || '/r.pdf');
end $$;

-- ---------------------------------------------------------------- helpers
create function rls_t.fail(msg text) returns void language plpgsql as $$ begin insert into rls_t.fails values (msg); end $$;
grant usage on schema rls_t to anon, authenticated;
grant select, insert on all tables in schema rls_t to anon, authenticated;
grant execute on all functions in schema rls_t to anon, authenticated;

-- ---------------------------------------------------------------- the checks
do $$
declare
  who text; t text; n bigint; cb uuid := rls_t.id('clinicB'); ca uuid := rls_t.id('clinicA');
  checked int := 0;
begin
  -- 1. every table in the public schema has row-level security switched on (except the migrations log)
  for t in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    perform rls_t.fail('RLS is OFF on public.' || t);
  end loop;

  -- 2. clinic A's people see none of clinic B's rows, in any table that has a clinic_id
  foreach who in array array['docA', 'staffA', 'patA1'] loop
    perform set_config('request.jwt.claim.sub', rls_t.id('u_' || who)::text, true);
    set local role authenticated;
    for t in select table_name from information_schema.columns
             where table_schema = 'public' and column_name = 'clinic_id' and table_name not in ('_migrations') loop
      execute format('select count(*) from public.%I where clinic_id = $1', t) into n using cb;
      checked := checked + 1;
      if n <> 0 then perform rls_t.fail(format('%s can see %s rows of clinic B in %s', who, n, t)); end if;
    end loop;
    reset role;
  end loop;
  raise notice 'cross-clinic read checks: % (3 roles x tables with clinic_id)', checked;

  -- 3. positive controls: the data really is there for the clinic that owns it
  perform set_config('request.jwt.claim.sub', rls_t.id('u_staffB')::text, true);
  set local role authenticated;
  select count(*) into n from patients where clinic_id = cb;
  if n <> 1 then perform rls_t.fail('control: staff B should see their own patient, saw ' || n); end if;
  select count(*) into n from journeys where clinic_id = cb;
  if n <> 1 then perform rls_t.fail('control: staff B should see their own journey, saw ' || n); end if;
  reset role;

  -- 4. a patient sees their own journey and tasks, not another patient's (same clinic)
  perform set_config('request.jwt.claim.sub', rls_t.id('u_patA1')::text, true);
  set local role authenticated;
  select count(*) into n from journeys where id = rls_t.id('jA1');
  if n <> 1 then perform rls_t.fail('patient A1 cannot see their own journey'); end if;
  select count(*) into n from journeys where id = rls_t.id('jA2');
  if n <> 0 then perform rls_t.fail('patient A1 can see patient A2''s journey'); end if;
  select count(*) into n from journey_tasks where journey_id = rls_t.id('jA2');
  if n <> 0 then perform rls_t.fail('patient A1 can see patient A2''s tasks'); end if;
  select count(*) into n from patients where id = rls_t.id('patA2');
  if n <> 0 then perform rls_t.fail('patient A1 can see patient A2''s record'); end if;
  select count(*) into n from profiles where clinic_id = ca and id <> rls_t.id('u_patA1');
  -- (staff names are shown to patients; other patients must not be)
  select count(*) into n from profiles where id = rls_t.id('u_patA2');
  if n <> 0 then perform rls_t.fail('patient A1 can see patient A2''s profile'); end if;
  reset role;

  -- 5. writes across clinics do nothing / are refused
  perform set_config('request.jwt.claim.sub', rls_t.id('u_staffA')::text, true);
  set local role authenticated;
  -- (If row-level security failed, these statements would reach the rows and may even raise errors: that is a failure too.)
  begin
    update patients set full_name = 'hacked' where clinic_id = cb; get diagnostics n = row_count;
    if n <> 0 then perform rls_t.fail('staff A updated ' || n || ' patients of clinic B'); end if;
  exception when others then perform rls_t.fail('staff A reached clinic B patients (update): ' || sqlerrm); end;
  begin
    delete from patients where clinic_id = cb; get diagnostics n = row_count;
    if n <> 0 then perform rls_t.fail('staff A deleted ' || n || ' patients of clinic B'); end if;
  exception when others then perform rls_t.fail('staff A reached clinic B patients (delete): ' || sqlerrm); end;
  begin
    update journey_tasks set status = 'accepted' where clinic_id = cb; get diagnostics n = row_count;
    if n <> 0 then perform rls_t.fail('staff A changed ' || n || ' tasks of clinic B'); end if;
  exception when others then perform rls_t.fail('staff A reached clinic B tasks: ' || sqlerrm); end;
  begin
    insert into patients (clinic_id, full_name) values (cb, 'planted');
    perform rls_t.fail('staff A inserted a patient into clinic B');
  exception when others then null; end;
  begin
    perform start_journey(rls_t.id('patB1'), rls_t.id('tplB1'), current_date + 5);
    perform rls_t.fail('staff A started a journey for a clinic B patient (clinic B template)');
  exception when others then null; end;
  begin
    perform start_journey(rls_t.id('patB1'), rls_t.id('tplA1'), current_date + 5);
    perform rls_t.fail('staff A started a journey for a clinic B patient (clinic A template)');
  exception when others then null; end;
  begin
    perform start_journey(rls_t.id('patA1'), rls_t.id('tplB1'), current_date + 5);
    perform rls_t.fail('staff A started a journey from a clinic B template');
  exception when others then null; end;
  reset role;

  -- 6. the doctor-only functions refuse staff, and the doctor of clinic A cannot touch clinic B
  perform set_config('request.jwt.claim.sub', rls_t.id('u_staffA')::text, true);
  set local role authenticated;
  begin
    perform save_clinical_summary(rls_t.id('jA1'), 'd', '', '', '', '', '');
    perform rls_t.fail('a secretary saved a clinical summary');
  exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claim.sub', rls_t.id('u_docA')::text, true);
  set local role authenticated;
  begin
    perform save_clinical_summary(rls_t.id('jB1'), 'd', '', '', '', '', '');
    perform rls_t.fail('doctor A saved a clinical summary in clinic B');
  exception when others then null; end;
  begin
    perform save_template(rls_t.id('tplB1'), 'renamed', 'p', 'd', '[]'::jsonb);
    perform rls_t.fail('doctor A edited a clinic B template');
  exception when others then null; end;
  reset role;

  -- 7. a patient cannot accept their own task, or reopen someone else's
  perform set_config('request.jwt.claim.sub', rls_t.id('u_patA1')::text, true);
  set local role authenticated;
  begin
    update journey_tasks set status = 'accepted' where journey_id = rls_t.id('jA1') and requires_review;
    get diagnostics n = row_count;
    if n > 0 then perform rls_t.fail('a patient marked their own review-required task as accepted'); end if;
  exception when others then null; end;
  begin
    update journey_tasks set status = 'submitted' where journey_id = rls_t.id('jA2'); get diagnostics n = row_count;
    if n <> 0 then perform rls_t.fail('patient A1 changed patient A2''s tasks'); end if;
  exception when others then perform rls_t.fail('patient A1 reached patient A2''s tasks: ' || sqlerrm); end;
  reset role;

  -- 8. files: evidence follows the journey, referral results are staff-only and clinic-scoped
  foreach who in array array['docA', 'staffA', 'patA1'] loop
    perform set_config('request.jwt.claim.sub', rls_t.id('u_' || who)::text, true);
    set local role authenticated;
    select count(*) into n from storage.objects where bucket_id = 'evidence' and name like rls_t.id('jB1') || '/%';
    if n <> 0 then perform rls_t.fail(who || ' can see clinic B''s evidence files'); end if;
    select count(*) into n from storage.objects where bucket_id = 'referral-results';
    if n <> 0 then perform rls_t.fail(who || ' can see clinic B''s referral results'); end if;
    reset role;
  end loop;
  perform set_config('request.jwt.claim.sub', rls_t.id('u_patA1')::text, true);
  set local role authenticated;
  select count(*) into n from storage.objects where bucket_id = 'evidence' and name like rls_t.id('jA1') || '/%';
  if n <> 1 then perform rls_t.fail('patient A1 cannot see their own evidence file'); end if;
  reset role;
  perform set_config('request.jwt.claim.sub', rls_t.id('u_staffB')::text, true);
  set local role authenticated;
  select count(*) into n from storage.objects where bucket_id = 'evidence' and name like rls_t.id('jB1') || '/%';
  if n <> 1 then perform rls_t.fail('control: staff B cannot see their own evidence file'); end if;
  select count(*) into n from storage.objects where bucket_id = 'referral-results';
  if n <> 1 then perform rls_t.fail('control: staff B cannot see their own referral result'); end if;
  reset role;

  -- 9. someone who is not signed in sees nothing
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  for t in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname = 'public' and c.relkind = 'r' and c.relname not like '\_%' loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      if n <> 0 then perform rls_t.fail(format('anonymous visitors can read %s rows of %s', n, t)); end if;
    exception when insufficient_privilege then null; end;
  end loop;
  reset role;

  -- 10. the internal tables (no policy at all) are closed to signed-in users
  perform set_config('request.jwt.claim.sub', rls_t.id('u_docA')::text, true);
  set local role authenticated;
  for t in select unnest(array['admin_audit', 'platform_admins', 'dev_tasks', 'dev_people', 'dev_subjects']) loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      if n <> 0 then perform rls_t.fail('a doctor can read ' || t); end if;
    exception when insufficient_privilege then null; end;
  end loop;
  reset role;
end $$;

do $$
declare n int; m text;
begin
  select count(*) into n from rls_t.fails;
  if n > 0 then
    for m in select msg from rls_t.fails loop raise warning 'FAIL: %', m; end loop;
    raise exception '% row-level-security check(s) failed', n;
  end if;
  raise notice 'all row-level-security checks passed';
end $$;
