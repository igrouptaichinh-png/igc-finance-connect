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

revoke all on schema public from anon;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.departments, public.profiles to authenticated;
grant select, insert, update on public.contribution_topics to authenticated;
grant select, insert, update on public.contributions to authenticated;
grant select, insert on public.contribution_comments, public.contribution_attachments to authenticated;
grant select, insert, delete on public.contribution_votes to authenticated;
grant select on public.contribution_events to authenticated;
grant select, insert, update on public.contribution_reviews to authenticated;
grant select, insert on public.improvements to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.handle_new_user() to service_role;

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
