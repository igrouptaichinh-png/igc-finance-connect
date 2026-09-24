begin;

set local statement_timeout = '10s';

create or replace function public.assign_contribution(p_contribution_id uuid, p_assignee_id uuid)
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

revoke all on function public.assign_contribution(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_contribution(uuid, uuid) to authenticated;

revoke update on public.contributions from authenticated;
grant update (
  title,
  description,
  expected_benefit,
  topic_id,
  status,
  priority,
  visibility,
  related_amount,
  currency,
  response_due_at,
  responded_at,
  outcome
) on public.contributions to authenticated;

commit;
