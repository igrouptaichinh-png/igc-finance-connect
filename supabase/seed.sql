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

insert into public.contribution_topics (code, category, name, description, response_hours, requires_review) values
  ('PAY_VENDOR', 'payment', 'Góp ý về thanh toán nhà cung cấp', 'Chia sẻ vướng mắc hoặc đề xuất cải tiến quy trình thanh toán.', 24, true),
  ('ADVANCE', 'advance', 'Góp ý về tạm ứng và hoàn ứng', 'Chia sẻ trải nghiệm về tạm ứng, hoàn ứng và chi phí phát sinh.', 16, true),
  ('BUDGET', 'budget', 'Đề xuất về theo dõi ngân sách', 'Đề xuất cách tra cứu, theo dõi hoặc điều chỉnh ngân sách thuận tiện hơn.', 32, true),
  ('INVOICE', 'invoice', 'Góp ý về hóa đơn và chứng từ', 'Chia sẻ điểm chưa thuận tiện khi kiểm tra và bổ sung chứng từ.', 12, false),
  ('MASTER_DATA', 'master_data', 'Đề xuất về mã dữ liệu tài chính', 'Đề xuất cải thiện việc tạo và cập nhật mã dữ liệu phục vụ giao dịch.', 24, false),
  ('REPORTING', 'reporting', 'Góp ý về báo cáo và đối soát', 'Chia sẻ nhu cầu cải thiện báo cáo, đối soát hoặc giải trình số liệu.', 40, false),
  ('POLICY', 'policy_advice', 'Trao đổi về chính sách tài chính', 'Giải đáp quy định, biểu mẫu và cách hạch toán.', 8, false)
on conflict (code) do nothing;
