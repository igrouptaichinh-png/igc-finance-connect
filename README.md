# IGC Finance Connect

> Cùng đóng góp · Cùng cải tiến.

Cổng thông tin nội bộ để các phòng ban chia sẻ ý kiến, cùng Phòng Tài chính trao đổi và ghi nhận những cải tiến đã áp dụng. Ứng dụng hỗ trợ đồng thời tài khoản demo để duyệt giao diện và tài khoản công ty thật qua Supabase Auth.

## Tài khoản demo

Mật khẩu chung: `demo123`

- Người đóng góp: `minhanh@demo.igc.vn`
- Người phụ trách: `thuha@demo.igc.vn`
- Người đánh giá: `ngoclinh@demo.igc.vn`
- Finance Admin: `admin@demo.igc.vn`

Có thể chọn tài khoản nhanh tại màn hình đăng nhập hoặc chuyển vai trò từ menu người dùng góc trên bên phải. Đây chỉ là phiên demo local, không phải cơ chế lưu token của bản production.

## Chạy local

Yêu cầu Node.js 20 trở lên và pnpm.

```bash
pnpm install
pnpm dev
```

Mặc định Vite mở tại `http://localhost:5173`. Kiểm tra trước khi phát hành:

```bash
pnpm lint
pnpm build
```

## Cấu trúc chính

- `src/pages`: các màn hình nghiệp vụ.
- `src/components`: khung ứng dụng và component dùng chung.
- `src/features/requests`: trạng thái và thao tác với ý kiến đóng góp.
- `src/features/auth`: phiên Supabase Auth, tài khoản demo dự phòng và phân quyền route.
- `src/features/accounts`: API quản trị tài khoản dành riêng cho Finance Admin.
- `src/domain`: kiểu dữ liệu nghiệp vụ.
- `src/lib`: định dạng và adapter dịch vụ.
- `supabase/schemas`: schema PostgreSQL, index, grants và RLS.
- `supabase/functions/manage-accounts`: Edge Function bảo vệ thao tác mời người dùng và thay đổi phân quyền.
- `PROJECT_PLAN.md`: phạm vi màn hình, nhận diện và lộ trình triển khai.

## Kết nối Supabase

Project Supabase, schema, RLS, Storage và Edge Function quản trị tài khoản đã được cấu hình. Sao chép `.env.example` thành `.env.local` và điền URL cùng publishable key khi chạy trên một máy mới.

Finance Admin thực hiện các tác vụ hằng ngày ngay tại màn hình **Tài khoản & phân quyền**:

- Gửi email mời và gán phòng ban/vai trò.
- Chuyển giữa bốn vai trò: Người đóng góp, Người phụ trách, Người đánh giá, Finance Admin.
- Khóa/mở tài khoản và cập nhật hồ sơ.

Edge Function xác minh lại Finance Admin ở phía máy chủ, ngăn tự hạ quyền và bảo đảm hệ thống luôn còn ít nhất một Admin hoạt động. Secret/service-role key không được đưa xuống trình duyệt.

Không đưa secret key hoặc service-role key vào biến `VITE_*` hay source code phía trình duyệt.

## Triển khai GitHub

Source code được lưu trong repository Public `igrouptaichinh-png/igc-finance-connect`. Mỗi lần cập nhật branch `main`, GitHub Actions sẽ kiểm tra lint/build và triển khai bản mới lên GitHub Pages.
