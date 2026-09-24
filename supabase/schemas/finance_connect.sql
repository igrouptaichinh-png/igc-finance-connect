-- IGC Finance Connect — declarative Supabase schema
-- Authorization data is stored in public.profiles, never in user-editable metadata.

create type public.app_role as enum ('requester', 'finance_agent', 'approver', 'finance_admin');
create type public.contribution_status as enum ('new', 'accepted', 'needs_information', 'under_review', 'in_progress', 'completed', 'not_applied');
create type public.contribution_priority as enum ('normal', 'significant', 'attention');
create type public.contribution_category as enum ('payment', 'advance', 'budget', 'invoice', 'master_data', 'reporting', 'policy_advice');
create type public.contribution_visibility as enum ('company', 'department', 'finance_only');
create type public.review_decision as enum ('pending', 'accepted', 'not_applied');

create table public.departments (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,20}$'),
  name text not null unique check (char_length(name) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  department_id bigint references public.departments (id),
  role public.app_role not null default 'requester',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contribution_topics (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,40}$'),
  category public.contribution_category not null,
  name text not null unique check (char_length(name) between 3 and 160),
  description text not null default '',
  response_hours smallint not null check (response_hours between 1 and 720),
  requires_review boolean not null default false,
  workflow_steps text[] not null default array['Ghi nhận ý kiến', 'Trao đổi và làm rõ', 'Phản hồi kết quả']::text[]
    constraint contribution_topics_workflow_steps_check check (cardinality(workflow_steps) between 2 and 8),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^FC-[0-9]{4}-[0-9]{4,}$'),
  title text not null check (char_length(title) between 5 and 180),
  description text not null check (char_length(description) between 10 and 5000),
  expected_benefit text check (expected_benefit is null or char_length(expected_benefit) <= 3000),
  topic_id bigint not null references public.contribution_topics (id),
  contributor_id uuid not null references public.profiles (user_id),
  department_id bigint not null references public.departments (id),
  status public.contribution_status not null default 'new',
  priority public.contribution_priority not null default 'normal',
  visibility public.contribution_visibility not null default 'company',
  related_amount numeric(18, 2) check (related_amount is null or related_amount >= 0),
  currency char(3) not null default 'VND' check (currency in ('VND', 'USD')),
  assignee_id uuid references public.profiles (user_id),
  reviewer_id uuid references public.profiles (user_id),
  response_due_at timestamptz not null,
  responded_at timestamptz,
  outcome text check (outcome is null or char_length(outcome) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contribution_comments (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  author_id uuid not null references public.profiles (user_id),
  body text not null check (char_length(body) between 1 and 4000),
  is_finance_only boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.contribution_votes (
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  voter_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contribution_id, voter_id)
);

create table public.contribution_events (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  actor_id uuid references public.profiles (user_id),
  event_type text not null check (char_length(event_type) between 2 and 50),
  detail text not null default '' check (char_length(detail) <= 4000),
  from_status public.contribution_status,
  to_status public.contribution_status,
  created_at timestamptz not null default now()
);

create table public.contribution_attachments (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  uploader_id uuid not null references public.profiles (user_id),
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (char_length(mime_type) between 3 and 120),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  created_at timestamptz not null default now()
);

create table public.contribution_reviews (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (user_id),
  sequence_no smallint not null default 1 check (sequence_no between 1 and 20),
  decision public.review_decision not null default 'pending',
  note text not null default '' check (char_length(note) <= 2000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contribution_id, sequence_no),
  constraint contribution_reviews_decision_timestamp_check check (
    (decision = 'pending' and decided_at is null)
    or (decision <> 'pending' and decided_at is not null)
  )
);

create table public.improvements (
  id bigint generated always as identity primary key,
  contribution_id uuid not null unique references public.contributions (id) on delete cascade,
  title text not null check (char_length(title) between 5 and 180),
  summary text not null check (char_length(summary) between 10 and 4000),
  impact_label text not null default '' check (char_length(impact_label) <= 120),
  implemented_at timestamptz not null,
  published_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default now()
);

create table public.finance_groups (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,30}$'),
  name text not null unique check (char_length(name) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_group_members (
  group_id bigint not null references public.finance_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  group_role text not null default 'member' check (group_role in ('lead', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.finance_topic_assignments (
  topic_id bigint primary key references public.contribution_topics (id) on delete cascade,
  group_id bigint not null references public.finance_groups (id) on delete cascade,
  primary_assignee_id uuid not null,
  backup_assignee_id uuid,
  updated_at timestamptz not null default now(),
  constraint finance_topic_assignments_primary_member_fk
    foreign key (group_id, primary_assignee_id) references public.finance_group_members (group_id, user_id),
  constraint finance_topic_assignments_backup_member_fk
    foreign key (group_id, backup_assignee_id) references public.finance_group_members (group_id, user_id),
  constraint finance_topic_assignments_distinct_assignees_check
    check (backup_assignee_id is null or backup_assignee_id <> primary_assignee_id)
);

create table public.notification_rules (
  event_key text primary key check (event_key in ('contribution_created', 'status_changed', 'comment_added')),
  label text not null check (char_length(label) between 3 and 120),
  description text not null default '' check (char_length(description) <= 500),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  notify_contributor boolean not null default false,
  notify_assignee boolean not null default false,
  notify_reviewer boolean not null default false,
  notify_group_leads boolean not null default false,
  notify_admins boolean not null default false,
  updated_by uuid references public.profiles (user_id),
  updated_at timestamptz not null default now(),
  constraint notification_rules_recipient_check check (
    not (in_app_enabled or email_enabled)
    or notify_contributor or notify_assignee or notify_reviewer or notify_group_leads or notify_admins
  )
);

create table public.user_notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (user_id) on delete cascade,
  contribution_id uuid references public.contributions (id) on delete cascade,
  event_key text not null references public.notification_rules (event_key),
  title text not null check (char_length(title) between 3 and 160),
  message text not null default '' check (char_length(message) <= 500),
  dedupe_key text not null check (char_length(dedupe_key) between 3 and 220),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, event_key, dedupe_key)
);

create index profiles_department_id_idx on public.profiles (department_id);
create index contribution_topics_category_active_idx on public.contribution_topics (category, is_active);
create index contributions_contributor_created_idx on public.contributions (contributor_id, created_at desc);
create index contributions_topic_created_idx on public.contributions (topic_id, created_at desc);
create index contributions_assignee_status_due_idx on public.contributions (assignee_id, status, response_due_at);
create index contributions_reviewer_status_idx on public.contributions (reviewer_id, status, updated_at desc);
create index contributions_department_created_idx on public.contributions (department_id, created_at desc);
create index contributions_visibility_created_idx on public.contributions (visibility, created_at desc);
create index contributions_open_queue_idx on public.contributions (priority desc, response_due_at, created_at)
  where status in ('new', 'accepted', 'needs_information', 'under_review', 'in_progress');
create index contribution_comments_contribution_created_idx on public.contribution_comments (contribution_id, created_at);
create index contribution_comments_author_idx on public.contribution_comments (author_id);
create index contribution_votes_voter_idx on public.contribution_votes (voter_id, created_at desc);
create index contribution_events_contribution_created_idx on public.contribution_events (contribution_id, created_at);
create index contribution_events_actor_idx on public.contribution_events (actor_id);
create index contribution_attachments_contribution_idx on public.contribution_attachments (contribution_id);
create index contribution_attachments_uploader_idx on public.contribution_attachments (uploader_id);
create index contribution_reviews_reviewer_decision_idx on public.contribution_reviews (reviewer_id, decision, created_at);
create index improvements_implemented_idx on public.improvements (implemented_at desc);
create index improvements_published_by_idx on public.improvements (published_by);
create index finance_groups_active_name_idx on public.finance_groups (is_active, name);
create index finance_group_members_user_idx on public.finance_group_members (user_id, group_id);
create index finance_topic_assignments_group_idx on public.finance_topic_assignments (group_id, topic_id);
create index finance_topic_assignments_primary_idx on public.finance_topic_assignments (primary_assignee_id);
create index finance_topic_assignments_backup_idx on public.finance_topic_assignments (backup_assignee_id) where backup_assignee_id is not null;
create index user_notifications_recipient_created_idx on public.user_notifications (recipient_id, created_at desc);
create index user_notifications_recipient_unread_idx on public.user_notifications (recipient_id, created_at desc) where read_at is null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger contribution_topics_set_updated_at before update on public.contribution_topics
for each row execute function public.set_updated_at();
create trigger contributions_set_updated_at before update on public.contributions
for each row execute function public.set_updated_at();
create trigger finance_groups_set_updated_at before update on public.finance_groups
for each row execute function public.set_updated_at();
create trigger finance_topic_assignments_set_updated_at before update on public.finance_topic_assignments
for each row execute function public.set_updated_at();
create trigger notification_rules_set_updated_at before update on public.notification_rules
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.save_finance_group_configuration(
  p_group_id bigint,
  p_code text,
  p_name text,
  p_description text,
  p_is_active boolean,
  p_members jsonb,
  p_topics jsonb
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_group_id bigint;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'
  ) then
    raise exception 'FINANCE_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_is_active and jsonb_array_length(coalesce(p_members, '[]'::jsonb)) = 0 then
    raise exception 'ACTIVE_GROUP_REQUIRES_MEMBER' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_members, '[]'::jsonb)) as m(user_id uuid, group_role text)
    left join public.profiles p on p.user_id = m.user_id
    where p.user_id is null or not p.is_active or p.role not in ('finance_agent', 'approver', 'finance_admin')
      or m.group_role not in ('lead', 'member')
  ) then
    raise exception 'INVALID_FINANCE_GROUP_MEMBER' using errcode = '22023';
  end if;

  if p_group_id is null then
    insert into public.finance_groups (code, name, description, is_active, created_by)
    values (upper(trim(p_code)), trim(p_name), trim(coalesce(p_description, '')), p_is_active, (select auth.uid()))
    returning id into v_group_id;
  else
    update public.finance_groups
    set code = upper(trim(p_code)), name = trim(p_name), description = trim(coalesce(p_description, '')), is_active = p_is_active
    where id = p_group_id
    returning id into v_group_id;
    if v_group_id is null then raise exception 'FINANCE_GROUP_NOT_FOUND' using errcode = 'P0002'; end if;
  end if;

  if exists (
    select 1
    from public.finance_topic_assignments a
    join jsonb_to_recordset(coalesce(p_topics, '[]'::jsonb)) as t(topic_id bigint, primary_assignee_id uuid, backup_assignee_id uuid)
      on t.topic_id = a.topic_id
    where a.group_id <> v_group_id
  ) then
    raise exception 'TOPIC_ALREADY_ASSIGNED' using errcode = '23505';
  end if;

  delete from public.finance_topic_assignments where group_id = v_group_id;
  delete from public.finance_group_members where group_id = v_group_id;

  insert into public.finance_group_members (group_id, user_id, group_role)
  select v_group_id, m.user_id, m.group_role
  from jsonb_to_recordset(coalesce(p_members, '[]'::jsonb)) as m(user_id uuid, group_role text);

  insert into public.finance_topic_assignments (topic_id, group_id, primary_assignee_id, backup_assignee_id)
  select t.topic_id, v_group_id, t.primary_assignee_id, t.backup_assignee_id
  from jsonb_to_recordset(coalesce(p_topics, '[]'::jsonb)) as t(topic_id bigint, primary_assignee_id uuid, backup_assignee_id uuid);

  return v_group_id;
end;
$$;

create function public.assign_contribution(p_contribution_id uuid, p_assignee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_assignee_name text;
  v_contribution_code text;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p
    where p.user_id = v_actor_id and p.is_active and p.role = 'finance_admin'
  ) then
    raise exception 'FINANCE_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_assignee_id is not null then
    select p.full_name into v_assignee_name
    from public.profiles p
    join public.departments d on d.id = p.department_id
    where p.user_id = p_assignee_id
      and p.is_active
      and p.role in ('finance_agent', 'finance_admin')
      and d.code = 'FINANCE_ACCOUNTING'
      and d.is_active;

    if v_assignee_name is null then
      raise exception 'INVALID_FINANCE_ASSIGNEE' using errcode = '22023';
    end if;
  end if;

  update public.contributions
  set assignee_id = p_assignee_id
  where id = p_contribution_id
  returning code into v_contribution_code;

  if v_contribution_code is null then
    raise exception 'CONTRIBUTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.contribution_events (contribution_id, actor_id, event_type, detail)
  values (
    p_contribution_id,
    v_actor_id,
    'assignee_changed',
    case
      when p_assignee_id is null then 'Đã bỏ phân công người phụ trách.'
      else 'Đã phân công ' || v_assignee_name || ' phụ trách ý kiến.'
    end
  );
end;
$$;

create function public.save_notification_rules(p_rules jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'
  ) then
    raise exception 'FINANCE_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_rules, '[]'::jsonb)) <> 'array' then
    raise exception 'INVALID_NOTIFICATION_RULES' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb)) as r(
      event_key text, in_app_enabled boolean, email_enabled boolean,
      notify_contributor boolean, notify_assignee boolean, notify_reviewer boolean,
      notify_group_leads boolean, notify_admins boolean
    )
    left join public.notification_rules n on n.event_key = r.event_key
    where n.event_key is null
      or ((coalesce(r.in_app_enabled, false) or coalesce(r.email_enabled, false))
        and not (coalesce(r.notify_contributor, false) or coalesce(r.notify_assignee, false)
          or coalesce(r.notify_reviewer, false) or coalesce(r.notify_group_leads, false)
          or coalesce(r.notify_admins, false)))
  ) then
    raise exception 'INVALID_NOTIFICATION_RULES' using errcode = '22023';
  end if;

  update public.notification_rules n
  set in_app_enabled = r.in_app_enabled,
      email_enabled = r.email_enabled,
      notify_contributor = r.notify_contributor,
      notify_assignee = r.notify_assignee,
      notify_reviewer = r.notify_reviewer,
      notify_group_leads = r.notify_group_leads,
      notify_admins = r.notify_admins,
      updated_by = (select auth.uid())
  from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb)) as r(
    event_key text, in_app_enabled boolean, email_enabled boolean,
    notify_contributor boolean, notify_assignee boolean, notify_reviewer boolean,
    notify_group_leads boolean, notify_admins boolean
  )
  where n.event_key = r.event_key;
end;
$$;

create function public.notify_contribution_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule public.notification_rules%rowtype;
  v_event_key text;
  v_title text;
  v_message text;
  v_dedupe_key text;
  v_actor uuid;
begin
  if tg_op = 'INSERT' then
    v_event_key := 'contribution_created';
    v_title := 'Đóng góp mới cần tiếp nhận';
    v_message := new.code || ' · ' || new.title;
    v_dedupe_key := 'created:' || new.id::text;
    v_actor := new.contributor_id;
  elsif old.status is distinct from new.status then
    v_event_key := 'status_changed';
    v_title := 'Trạng thái đóng góp đã thay đổi';
    v_message := new.code || ' · ' || case new.status
      when 'new' then 'Mới'
      when 'accepted' then 'Đang tiếp nhận'
      when 'needs_information' then 'Chờ bổ sung'
      when 'under_review' then 'Chờ phê duyệt'
      when 'in_progress' then 'Đang xử lý'
      when 'completed' then 'Hoàn tất'
      when 'not_applied' then 'Không áp dụng'
    end;
    v_dedupe_key := 'status:' || new.id::text || ':' || new.status::text || ':' || extract(epoch from new.updated_at)::bigint::text;
    v_actor := (select auth.uid());
  else
    return new;
  end if;

  select * into v_rule from public.notification_rules where event_key = v_event_key;
  if not found or not v_rule.in_app_enabled then return new; end if;

  insert into public.user_notifications (recipient_id, contribution_id, event_key, title, message, dedupe_key)
  select distinct recipients.user_id, new.id, v_event_key, v_title, v_message, v_dedupe_key
  from (
    select new.contributor_id as user_id where v_rule.notify_contributor
    union select new.assignee_id where v_rule.notify_assignee and new.assignee_id is not null
    union select a.primary_assignee_id from public.finance_topic_assignments a where v_rule.notify_assignee and a.topic_id = new.topic_id
    union select a.backup_assignee_id from public.finance_topic_assignments a where v_rule.notify_assignee and a.topic_id = new.topic_id and a.backup_assignee_id is not null
    union select new.reviewer_id where v_rule.notify_reviewer and new.reviewer_id is not null
    union select m.user_id from public.finance_topic_assignments a join public.finance_group_members m on m.group_id = a.group_id and m.group_role = 'lead' where v_rule.notify_group_leads and a.topic_id = new.topic_id
    union select p.user_id from public.profiles p where v_rule.notify_admins and p.is_active and p.role = 'finance_admin'
  ) recipients
  where recipients.user_id is not null and recipients.user_id is distinct from v_actor
  on conflict (recipient_id, event_key, dedupe_key) do nothing;

  return new;
end;
$$;

create function public.notify_comment_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule public.notification_rules%rowtype;
  v_contribution public.contributions%rowtype;
begin
  select * into v_rule from public.notification_rules where event_key = 'comment_added';
  if not found or not v_rule.in_app_enabled then return new; end if;
  select * into v_contribution from public.contributions where id = new.contribution_id;

  insert into public.user_notifications (recipient_id, contribution_id, event_key, title, message, dedupe_key)
  select distinct recipients.user_id, new.contribution_id, 'comment_added', 'Có trao đổi mới',
    v_contribution.code || ' · ' || v_contribution.title, 'comment:' || new.id::text
  from (
    select v_contribution.contributor_id as user_id where v_rule.notify_contributor
    union select v_contribution.assignee_id where v_rule.notify_assignee and v_contribution.assignee_id is not null
    union select a.primary_assignee_id from public.finance_topic_assignments a where v_rule.notify_assignee and a.topic_id = v_contribution.topic_id
    union select a.backup_assignee_id from public.finance_topic_assignments a where v_rule.notify_assignee and a.topic_id = v_contribution.topic_id and a.backup_assignee_id is not null
    union select v_contribution.reviewer_id where v_rule.notify_reviewer and v_contribution.reviewer_id is not null
    union select m.user_id from public.finance_topic_assignments a join public.finance_group_members m on m.group_id = a.group_id and m.group_role = 'lead' where v_rule.notify_group_leads and a.topic_id = v_contribution.topic_id
    union select p.user_id from public.profiles p where v_rule.notify_admins and p.is_active and p.role = 'finance_admin'
  ) recipients
  where recipients.user_id is not null and recipients.user_id <> new.author_id
  on conflict (recipient_id, event_key, dedupe_key) do nothing;

  return new;
end;
$$;

create trigger contributions_notify_change
after insert or update of status on public.contributions
for each row execute function public.notify_contribution_change();
create trigger contribution_comments_notify_added
after insert on public.contribution_comments
for each row execute function public.notify_comment_added();

insert into public.notification_rules (
  event_key, label, description, in_app_enabled, email_enabled,
  notify_contributor, notify_assignee, notify_reviewer, notify_group_leads, notify_admins
) values
  ('contribution_created', 'Có đóng góp mới', 'Báo cho Phòng Tài chính khi có ý kiến mới cần tiếp nhận.', true, false, false, true, false, true, true),
  ('status_changed', 'Trạng thái thay đổi', 'Cập nhật cho các bên liên quan khi tiến độ xử lý thay đổi.', true, false, true, true, true, false, false),
  ('comment_added', 'Có trao đổi mới', 'Báo khi có phản hồi hoặc thông tin bổ sung trong một đóng góp.', true, false, true, true, true, false, false);

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.contribution_topics enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_comments enable row level security;
alter table public.contribution_votes enable row level security;
alter table public.contribution_events enable row level security;
alter table public.contribution_attachments enable row level security;
alter table public.contribution_reviews enable row level security;
alter table public.improvements enable row level security;
alter table public.finance_groups enable row level security;
alter table public.finance_group_members enable row level security;
alter table public.finance_topic_assignments enable row level security;
alter table public.notification_rules enable row level security;
alter table public.user_notifications enable row level security;

create policy "authenticated users read departments"
on public.departments for select to authenticated using (is_active = true);
create policy "authenticated users read topics"
on public.contribution_topics for select to authenticated
using (
  is_active = true
  or exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'
  )
);
create policy "finance admins create topics"
on public.contribution_topics for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'
  )
);
create policy "finance admins update topics"
on public.contribution_topics for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'
  )
);
create policy "authenticated users read active directory"
on public.profiles for select to authenticated using (is_active = true);

create policy "users read contributions in scope"
on public.contributions for select to authenticated
using (
  contributor_id = (select auth.uid())
  or visibility = 'company'
  or (
    visibility = 'department'
    and department_id = (
      select p.department_id from public.profiles p
      where p.user_id = (select auth.uid()) and p.is_active
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active
      and p.role in ('finance_agent', 'approver', 'finance_admin')
  )
);

create policy "users create their own contributions"
on public.contributions for insert to authenticated
with check (
  contributor_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.department_id = department_id
      and p.is_active
  )
);

create policy "contributors and finance roles update contributions"
on public.contributions for update to authenticated
using (
  (contributor_id = (select auth.uid()) and status in ('new', 'needs_information'))
  or exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.is_active
        and p.role in ('finance_agent', 'approver', 'finance_admin')
    )
)
with check (
  (contributor_id = (select auth.uid()) and status in ('new', 'needs_information'))
  or exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.is_active
        and p.role in ('finance_agent', 'approver', 'finance_admin')
    )
);

create policy "users read comments on visible contributions"
on public.contribution_comments for select to authenticated
using (
  exists (select 1 from public.contributions c where c.id = contribution_id)
  and (
    not is_finance_only
    or exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.is_active
        and p.role in ('finance_agent', 'approver', 'finance_admin')
    )
  )
);

create policy "users comment on visible contributions"
on public.contribution_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.contributions c where c.id = contribution_id)
  and (
    not is_finance_only
    or exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.is_active
        and p.role in ('finance_agent', 'approver', 'finance_admin')
    )
  )
);

create policy "users read votes on visible contributions"
on public.contribution_votes for select to authenticated
using (exists (select 1 from public.contributions c where c.id = contribution_id));
create policy "users vote on visible contributions"
on public.contribution_votes for insert to authenticated
with check (
  voter_id = (select auth.uid())
  and exists (select 1 from public.contributions c where c.id = contribution_id)
);
create policy "users remove their own votes"
on public.contribution_votes for delete to authenticated
using (voter_id = (select auth.uid()));

create policy "users read events on visible contributions"
on public.contribution_events for select to authenticated
using (exists (select 1 from public.contributions c where c.id = contribution_id));

create policy "users read attachments on visible contributions"
on public.contribution_attachments for select to authenticated
using (exists (select 1 from public.contributions c where c.id = contribution_id));
create policy "users attach files to visible contributions"
on public.contribution_attachments for insert to authenticated
with check (
  uploader_id = (select auth.uid())
  and exists (select 1 from public.contributions c where c.id = contribution_id)
);

create policy "users read reviews on visible contributions"
on public.contribution_reviews for select to authenticated
using (exists (select 1 from public.contributions c where c.id = contribution_id));
create policy "finance roles create reviews"
on public.contribution_reviews for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active
      and p.role in ('approver', 'finance_admin')
  )
);
create policy "assigned reviewers decide"
on public.contribution_reviews for update to authenticated
using (
  reviewer_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'
  )
)
with check (
  reviewer_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'
  )
);

create policy "authenticated users read improvements"
on public.improvements for select to authenticated using (true);
create policy "finance admins publish improvements"
on public.improvements for insert to authenticated
with check (
  published_by = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'
  )
);

create policy "authenticated users read active finance groups"
on public.finance_groups for select to authenticated
using (
  is_active
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin')
);
create policy "finance admins create groups"
on public.finance_groups for insert to authenticated
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins update groups"
on public.finance_groups for update to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'))
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins delete groups"
on public.finance_groups for delete to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));

create policy "authenticated users read active group members"
on public.finance_group_members for select to authenticated
using (
  exists (select 1 from public.finance_groups g where g.id = group_id and g.is_active)
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin')
);
create policy "finance admins create group members"
on public.finance_group_members for insert to authenticated
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins update group members"
on public.finance_group_members for update to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'))
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins delete group members"
on public.finance_group_members for delete to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));

create policy "authenticated users read active topic assignments"
on public.finance_topic_assignments for select to authenticated
using (
  exists (select 1 from public.finance_groups g where g.id = group_id and g.is_active)
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin')
);
create policy "finance admins create topic assignments"
on public.finance_topic_assignments for insert to authenticated
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins update topic assignments"
on public.finance_topic_assignments for update to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'))
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins delete topic assignments"
on public.finance_topic_assignments for delete to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));

create policy "authenticated users read notification rules"
on public.notification_rules for select to authenticated using (true);
create policy "finance admins update notification rules"
on public.notification_rules for update to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'))
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));

create policy "users read their own notifications"
on public.user_notifications for select to authenticated
using (recipient_id = (select auth.uid()));
create policy "users update their own notifications"
on public.user_notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

revoke all on schema public from anon;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.save_finance_group_configuration(bigint, text, text, text, boolean, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.assign_contribution(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_notification_rules(jsonb) from public, anon, authenticated;
revoke all on function public.notify_contribution_change() from public, anon, authenticated;
revoke all on function public.notify_comment_added() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.departments, public.profiles to authenticated;
grant select, insert, update on public.contribution_topics to authenticated;
grant select, insert on public.contributions to authenticated;
grant update (title, description, expected_benefit, topic_id, status, priority, visibility, related_amount, currency, response_due_at, responded_at, outcome)
on public.contributions to authenticated;
grant select, insert on public.contribution_comments, public.contribution_attachments to authenticated;
grant select, insert, delete on public.contribution_votes to authenticated;
grant select on public.contribution_events to authenticated;
grant select, insert, update on public.contribution_reviews to authenticated;
grant select, insert on public.improvements to authenticated;
grant select, insert, update, delete on public.finance_groups, public.finance_group_members, public.finance_topic_assignments to authenticated;
grant select, update on public.notification_rules, public.user_notifications to authenticated;
grant execute on function public.save_finance_group_configuration(bigint, text, text, text, boolean, jsonb, jsonb) to authenticated;
grant execute on function public.assign_contribution(uuid, uuid) to authenticated;
grant execute on function public.save_notification_rules(jsonb) to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.save_finance_group_configuration(bigint, text, text, text, boolean, jsonb, jsonb) to service_role;
grant execute on function public.save_notification_rules(jsonb) to service_role;
grant execute on function public.notify_contribution_change() to service_role;
grant execute on function public.notify_comment_added() to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('finance-connect-attachments', 'finance-connect-attachments', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "users read scoped contribution files"
on storage.objects for select to authenticated
using (
  bucket_id = 'finance-connect-attachments'
  and exists (
    select 1 from public.contributions c
    where c.id::text = (storage.foldername(name))[1]
  )
);

create policy "users upload scoped contribution files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'finance-connect-attachments'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1 from public.contributions c
    where c.id::text = (storage.foldername(name))[1]
  )
);

create policy "users update their contribution files"
on storage.objects for update to authenticated
using (
  bucket_id = 'finance-connect-attachments'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'finance-connect-attachments'
  and owner_id = (select auth.uid()::text)
);

create policy "users delete their contribution files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'finance-connect-attachments'
  and owner_id = (select auth.uid()::text)
);
