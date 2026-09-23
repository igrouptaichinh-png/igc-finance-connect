create table if not exists public.finance_groups (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,30}$'),
  name text not null unique check (char_length(name) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_group_members (
  group_id bigint not null references public.finance_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  group_role text not null default 'member' check (group_role in ('lead', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.finance_topic_assignments (
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

create index if not exists finance_groups_active_name_idx on public.finance_groups (is_active, name);
create index if not exists finance_group_members_user_idx on public.finance_group_members (user_id, group_id);
create index if not exists finance_topic_assignments_group_idx on public.finance_topic_assignments (group_id, topic_id);
create index if not exists finance_topic_assignments_primary_idx on public.finance_topic_assignments (primary_assignee_id);
create index if not exists finance_topic_assignments_backup_idx on public.finance_topic_assignments (backup_assignee_id) where backup_assignee_id is not null;

drop trigger if exists finance_groups_set_updated_at on public.finance_groups;
create trigger finance_groups_set_updated_at before update on public.finance_groups
for each row execute function public.set_updated_at();
drop trigger if exists finance_topic_assignments_set_updated_at on public.finance_topic_assignments;
create trigger finance_topic_assignments_set_updated_at before update on public.finance_topic_assignments
for each row execute function public.set_updated_at();

create or replace function public.save_finance_group_configuration(
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

alter table public.finance_groups enable row level security;
alter table public.finance_group_members enable row level security;
alter table public.finance_topic_assignments enable row level security;

drop policy if exists "authenticated users read active finance groups" on public.finance_groups;
drop policy if exists "finance admins create groups" on public.finance_groups;
drop policy if exists "finance admins update groups" on public.finance_groups;
drop policy if exists "finance admins delete groups" on public.finance_groups;
create policy "authenticated users read active finance groups" on public.finance_groups for select to authenticated
using (is_active or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins create groups" on public.finance_groups for insert to authenticated
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins update groups" on public.finance_groups for update to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'))
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins delete groups" on public.finance_groups for delete to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));

drop policy if exists "authenticated users read active group members" on public.finance_group_members;
drop policy if exists "finance admins create group members" on public.finance_group_members;
drop policy if exists "finance admins update group members" on public.finance_group_members;
drop policy if exists "finance admins delete group members" on public.finance_group_members;
create policy "authenticated users read active group members" on public.finance_group_members for select to authenticated
using (exists (select 1 from public.finance_groups g where g.id = group_id and g.is_active) or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins create group members" on public.finance_group_members for insert to authenticated
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins update group members" on public.finance_group_members for update to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'))
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins delete group members" on public.finance_group_members for delete to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));

drop policy if exists "authenticated users read active topic assignments" on public.finance_topic_assignments;
drop policy if exists "finance admins create topic assignments" on public.finance_topic_assignments;
drop policy if exists "finance admins update topic assignments" on public.finance_topic_assignments;
drop policy if exists "finance admins delete topic assignments" on public.finance_topic_assignments;
create policy "authenticated users read active topic assignments" on public.finance_topic_assignments for select to authenticated
using (exists (select 1 from public.finance_groups g where g.id = group_id and g.is_active) or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins create topic assignments" on public.finance_topic_assignments for insert to authenticated
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins update topic assignments" on public.finance_topic_assignments for update to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'))
with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));
create policy "finance admins delete topic assignments" on public.finance_topic_assignments for delete to authenticated
using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_active and p.role = 'finance_admin'));

revoke all on public.finance_groups, public.finance_group_members, public.finance_topic_assignments from anon, authenticated;
grant select, insert, update, delete on public.finance_groups, public.finance_group_members, public.finance_topic_assignments to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke all on function public.save_finance_group_configuration(bigint, text, text, text, boolean, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_finance_group_configuration(bigint, text, text, text, boolean, jsonb, jsonb) to authenticated, service_role;
