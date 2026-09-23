-- In-app notification rules and per-user inbox.

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

create index user_notifications_recipient_created_idx on public.user_notifications (recipient_id, created_at desc);
create index user_notifications_recipient_unread_idx on public.user_notifications (recipient_id, created_at desc) where read_at is null;

create trigger notification_rules_set_updated_at before update on public.notification_rules
for each row execute function public.set_updated_at();

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

alter table public.notification_rules enable row level security;
alter table public.user_notifications enable row level security;

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

revoke all on table public.notification_rules, public.user_notifications from anon, authenticated;
revoke all on sequence public.user_notifications_id_seq from anon, authenticated;
revoke all on function public.save_notification_rules(jsonb) from public, anon, authenticated;
revoke all on function public.notify_contribution_change() from public, anon, authenticated;
revoke all on function public.notify_comment_added() from public, anon, authenticated;

grant select, update on table public.notification_rules, public.user_notifications to authenticated;
grant execute on function public.save_notification_rules(jsonb) to authenticated;
grant all on table public.notification_rules, public.user_notifications to service_role;
grant all on sequence public.user_notifications_id_seq to service_role;
grant execute on function public.save_notification_rules(jsonb) to service_role;
grant execute on function public.notify_contribution_change() to service_role;
grant execute on function public.notify_comment_added() to service_role;
