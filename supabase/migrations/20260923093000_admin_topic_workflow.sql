alter table public.contribution_topics
  add column if not exists workflow_steps text[] not null
  default array['Ghi nhận ý kiến', 'Trao đổi và làm rõ', 'Phản hồi kết quả']::text[];

alter table public.contribution_topics
  drop constraint if exists contribution_topics_workflow_steps_check;

alter table public.contribution_topics
  add constraint contribution_topics_workflow_steps_check
  check (cardinality(workflow_steps) between 2 and 8);

drop policy if exists "authenticated users read topics" on public.contribution_topics;
drop policy if exists "finance admins create topics" on public.contribution_topics;
drop policy if exists "finance admins update topics" on public.contribution_topics;

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

grant select, insert, update on public.contribution_topics to authenticated;
