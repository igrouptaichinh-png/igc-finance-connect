import type { RequestPriority, RequestStatus } from '../domain/types'
import { priorityLabels, statusLabels } from '../lib/copy'

const statusClass: Record<RequestStatus, string> = {
  'Mới': 'badge-new',
  'Đang tiếp nhận': 'badge-info',
  'Chờ bổ sung': 'badge-warn',
  'Chờ phê duyệt': 'badge-approval',
  'Đang xử lý': 'badge-progress',
  'Hoàn tất': 'badge-good',
  'Từ chối': 'badge-bad',
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`status-badge ${statusClass[status]}`}><i />{statusLabels[status]}</span>
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return <span className={`priority priority-${priority === 'Khẩn' ? 'urgent' : priority === 'Ưu tiên' ? 'high' : 'normal'}`}>{priorityLabels[priority]}</span>
}
