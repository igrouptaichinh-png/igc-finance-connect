# Kế hoạch sản phẩm — IGC Finance Connect

## Mục tiêu

Tạo một không gian chung để các phòng ban đóng góp ý kiến, cùng Phòng Tài chính trao đổi minh bạch và biến phản hồi thành những cải tiến thiết thực.

## Cấu trúc màn hình

1. **Tổng quan** — hành trình đóng góp, ý kiến gần đây và chủ đề cần quan tâm.
2. **Chia sẻ ý kiến** — biểu mẫu ba bước: chọn chủ đề, chia sẻ nội dung, kiểm tra & gửi.
3. **Đóng góp của tôi** — tìm kiếm, lọc, xem chi tiết và tiếp tục trao đổi.
4. **Cộng đồng đóng góp** — tham khảo ý kiến nội bộ, đồng tình và thảo luận.
5. **Ý kiến chờ phản hồi** — không gian làm việc của nhóm Tài chính.
6. **Đề xuất đang đánh giá** — ghi nhận khả năng áp dụng và phản hồi kết quả.
7. **Cải tiến đã áp dụng** — công khai thay đổi tích cực xuất phát từ đóng góp.
8. **Kho kiến thức** — quy trình, biểu mẫu và câu hỏi thường gặp.
9. **Báo cáo** — mức độ tham gia, thời gian phản hồi và hiệu quả cải tiến.
10. **Quản trị** — tài khoản, chủ đề đóng góp, thời gian phản hồi và tích hợp.

## Nhận diện kế thừa từ App Kho

- Logo Nha Trang Seafoods/IGC được dùng trong sidebar.
- Font giao diện `Mulish`; số liệu và mã dùng `Roboto`.
- Navy `#093670`, blue `#004684`, amber `#C2710C`, red `#AB0101`, nền `#F3F6F9`.
- Sidebar 256px, thẻ bo góc vừa phải, mật độ dữ liệu phù hợp màn hình vận hành.
- Có dark mode và responsive cho tablet/mobile.

## Kiểm tra năng lực/skill

- `frontend-design`: định hướng UI và hệ thống phân cấp thông tin — đủ cho MVP.
- `fullstack-dev`: cấu trúc React, ranh giới feature và repository — đủ cho MVP.
- `supabase`: Auth, Database, Storage, Realtime và RLS — đủ cho giai đoạn tích hợp.
- `supabase-postgres-best-practices`: schema, index, policy và quyền — đủ cho giai đoạn dữ liệu.
- `computer-use`: mở và kiểm thử bản xem trước trực tiếp — đủ cho vòng review local.

Chưa cần bổ sung skill bắt buộc. Khi phát hành nên bổ sung kiểm thử E2E, accessibility audit và security review độc lập.

## Gợi ý sản phẩm

- Thiết lập cam kết phản hồi theo chủ đề, mức ảnh hưởng và lịch làm việc.
- Cho phép chọn phạm vi chia sẻ: công khai nội bộ, trong phòng ban hoặc chỉ Phòng Tài chính.
- Phân tách vai trò: Người đóng góp, Người phụ trách, Người đánh giá và Finance Admin.
- Lưu audit log bất biến cho mọi thay đổi trạng thái và kết quả đánh giá.
- Chỉ lưu file trong bucket private; dùng signed URL có thời hạn.
- Thêm thông báo email/Teams ở giai đoạn 2, sau khi quy trình lõi ổn định.
- Đo thời gian phản hồi đầu tiên, tỷ lệ đúng hẹn, mức độ đồng tình và tỷ lệ đề xuất được áp dụng.

## Trạng thái triển khai

- Hoàn tất: folder riêng, cấu trúc màn hình Finance Connect, nhận diện App Kho, kiểm tra skill, UI local, dữ liệu demo, đăng nhập demo và phân quyền ba vai trò.
- Hoàn tất: trang quản lý tài khoản demo, mời thành viên, khóa/mở tài khoản và chuyển vai trò để kiểm thử.
- Đã chuẩn bị: adapter Supabase, biến môi trường mẫu, schema PostgreSQL/RLS.
- Chờ duyệt: tạo repository GitHub, GitHub Pages/Actions, project Supabase và dữ liệu thật.
