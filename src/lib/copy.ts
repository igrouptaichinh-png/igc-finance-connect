import type { RequestPriority, RequestStatus } from '../domain/types'

export const statusLabels: Record<RequestStatus, string> = {
  'Mới': 'Mới chia sẻ',
  'Đang tiếp nhận': 'Đã ghi nhận',
  'Chờ bổ sung': 'Cần thêm thông tin',
  'Chờ phê duyệt': 'Đang đánh giá',
  'Đang xử lý': 'Đang xem xét',
  'Hoàn tất': 'Đã phản hồi',
  'Từ chối': 'Chưa thể áp dụng',
}

export const priorityLabels: Record<RequestPriority, string> = {
  'Thường': 'Thông thường',
  'Ưu tiên': 'Ảnh hưởng đáng kể',
  'Khẩn': 'Cần lưu ý sớm',
}
