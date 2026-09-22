# IGC Finance Connect

> Cùng đóng góp · Cùng cải tiến.

Cổng thông tin nội bộ để các phòng ban chia sẻ ý kiến, cùng Phòng Tài chính trao đổi và ghi nhận những cải tiến đã áp dụng. Bản hiện tại chạy hoàn toàn trên local với dữ liệu demo lưu trong trình duyệt; lớp kết nối Supabase đã được chuẩn bị nhưng chưa kích hoạt.

## Tài khoản demo

Mật khẩu chung: `demo123`

- Người đóng góp: `minhanh@demo.igc.vn`
- Người phụ trách: `thuha@demo.igc.vn`
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
- `src/features/auth`: phiên đăng nhập demo, tài khoản và phân quyền route.
- `src/domain`: kiểu dữ liệu nghiệp vụ.
- `src/lib`: định dạng và adapter dịch vụ.
- `supabase/schemas`: schema PostgreSQL/RLS chuẩn bị cho môi trường Supabase.
- `PROJECT_PLAN.md`: phạm vi màn hình, nhận diện và lộ trình triển khai.

## Kết nối Supabase (giai đoạn sau)

1. Tạo project Supabase.
2. Sao chép `.env.example` thành `.env.local` và điền URL cùng publishable key.
3. Cài Supabase CLI, liên kết project và áp dụng schema sau khi review.
4. Tạo bucket private `finance-request-attachments` và policy theo `request_id`.
5. Thay repository demo/localStorage bằng repository Supabase.

Không đưa secret key hoặc service-role key vào biến `VITE_*` hay source code phía trình duyệt.

## Triển khai GitHub

Ứng dụng dùng hash routing nên có thể chạy trên GitHub Pages mà không cần cấu hình rewrite. Chỉ tạo repository/remote và workflow deploy sau khi bản local được duyệt.
