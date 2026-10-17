-- Creates the platform admin login. Run after patch-admin.sql.
-- Edit the two values below first. Choose a strong password. Do not commit your real password.
-- Log in at the app with the username only (it is stored as <username>@medix.local).

do $$
declare
  v_username text := 'admin';                        -- <-- your username
  v_password text := 'CHANGE-ME-TO-A-STRONG-PASSWORD'; -- <-- your password (12+ characters)
  v_uid uuid := gen_random_uuid();
begin
  if v_password = 'CHANGE-ME-TO-A-STRONG-PASSWORD' then
    raise exception 'Edit v_password first';
  end if;
  if exists (select 1 from auth.users where email = v_username || '@medix.local') then
    raise exception 'That username already exists';
  end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_username || '@medix.local', crypt(v_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', v_username || '@medix.local'), 'email', now(), now(), now());

  insert into platform_admins (user_id) values (v_uid);
end $$;
