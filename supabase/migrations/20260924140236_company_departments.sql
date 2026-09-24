begin;

set local statement_timeout = '10s';

-- Preserve the existing department IDs so profiles and contributions keep
-- their current relationships while the company directory is renamed.
update public.departments
set code = 'FINANCE_ACCOUNTING',
    name = 'Khối Tài chính-Kế toán',
    is_active = true
where code in ('FINANCE', 'FINANCE_ACCOUNTING');

update public.departments
set code = 'SALES_MARKETING',
    name = 'Khối Kinh Doanh & Marketing',
    is_active = true
where code in ('SALES', 'SALES_MARKETING');

update public.departments
set name = 'Khối Kho vận & Logistics',
    is_active = true
where code = 'LOGISTICS';

update public.departments
set code = 'GOODS_SERVICES',
    name = 'Khối cung ứng hàng hóa, dịch vụ',
    is_active = true
where code in ('PURCHASE', 'GOODS_SERVICES');

update public.departments
set name = 'Khối Nhân Sự',
    is_active = true
where code = 'HR';

update public.departments
set code = 'IT_DIGITAL',
    name = 'Khối CNTT & Chuyển đổi số',
    is_active = true
where code in ('IT', 'IT_DIGITAL');

update public.departments
set name = 'Khối Sản Xuất',
    is_active = true
where code = 'PRODUCTION';

update public.departments
set code = 'QUALITY',
    name = 'Khối Quản lý chất lượng',
    is_active = true
where code in ('PROJECT', 'QUALITY');

insert into public.departments (code, name, is_active) values
  ('RAW_MATERIAL_SUPPLY', 'Khối cung ứng nguyên liệu (Cá + Tôm)', true),
  ('GOODS_SERVICES', 'Khối cung ứng hàng hóa, dịch vụ', true),
  ('PRODUCTION', 'Khối Sản Xuất', true),
  ('QUALITY', 'Khối Quản lý chất lượng', true),
  ('LOGISTICS', 'Khối Kho vận & Logistics', true),
  ('SALES_MARKETING', 'Khối Kinh Doanh & Marketing', true),
  ('FINANCE_ACCOUNTING', 'Khối Tài chính-Kế toán', true),
  ('HR', 'Khối Nhân Sự', true),
  ('IT_DIGITAL', 'Khối CNTT & Chuyển đổi số', true),
  ('INTERNAL_CONTROL', 'Ban kiểm soát nội bộ', true)
on conflict (code) do update
set name = excluded.name,
    is_active = excluded.is_active;

update public.departments
set is_active = false
where code not in (
  'RAW_MATERIAL_SUPPLY',
  'GOODS_SERVICES',
  'PRODUCTION',
  'QUALITY',
  'LOGISTICS',
  'SALES_MARKETING',
  'FINANCE_ACCOUNTING',
  'HR',
  'IT_DIGITAL',
  'INTERNAL_CONTROL'
);

do $$
declare
  active_department_count integer;
begin
  select count(*)
  into active_department_count
  from public.departments
  where is_active
    and code in (
      'RAW_MATERIAL_SUPPLY',
      'GOODS_SERVICES',
      'PRODUCTION',
      'QUALITY',
      'LOGISTICS',
      'SALES_MARKETING',
      'FINANCE_ACCOUNTING',
      'HR',
      'IT_DIGITAL',
      'INTERNAL_CONTROL'
    );

  if active_department_count <> 10 then
    raise exception 'Expected 10 active company departments, found %', active_department_count;
  end if;
end
$$;

commit;
