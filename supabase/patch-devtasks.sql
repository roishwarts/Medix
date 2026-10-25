-- Admin "dev tasks" backlog: subjects and tasks for the platform owner. Safe to re-run.
-- Only the server (service role) reads these tables; RLS stays on with no policies.

create table if not exists dev_subjects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists dev_tasks (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references dev_subjects(id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists dev_tasks_subject on dev_tasks(subject_id);

alter table dev_subjects enable row level security;
alter table dev_tasks enable row level security;

-- Starter backlog, only when the list is empty. Edit or delete freely.
do $$
declare s_sec uuid; s_prod uuid; s_infra uuid;
begin
  if exists (select 1 from dev_subjects) then return; end if;
  insert into dev_subjects (title) values ('אבטחה ופרטיות') returning id into s_sec;
  insert into dev_subjects (title) values ('הרחבות מוצר') returning id into s_prod;
  insert into dev_subjects (title) values ('תשתית') returning id into s_infra;
  insert into dev_tasks (subject_id, title) values
    (s_sec, 'אימות דו-שלבי גם למנהל המערכת'),
    (s_sec, 'רישום צפייה בתיק מטופל (מי פתח ומתי)'),
    (s_sec, 'בדיקת חדירות עצמאית לפני עלייה עם מטופלים אמיתיים'),
    (s_sec, 'הסכמי עיבוד מידע עם Supabase ו-Vercel'),
    (s_sec, 'מדיניות שמירה ומחיקה של מידע'),
    (s_sec, 'מסמך אבטחה של עמוד אחד לרופאים'),
    (s_prod, 'תזכורות אוטומטיות בוואטסאפ ובמייל'),
    (s_prod, 'כניסה עם Google'),
    (s_prod, 'אנליטיקה למרפאה: אחוז מטופלים מוכנים בזמן'),
    (s_prod, 'השעיית מרפאה'),
    (s_infra, 'אזור הפעלה של Vercel זהה לאזור של Supabase'),
    (s_infra, 'גיבויים ושחזור לנקודת זמן'),
    (s_infra, 'מעבר לתוכניות בתשלום לפני עלייה לאוויר');
end $$;
