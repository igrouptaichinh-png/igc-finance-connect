export type RequestStatus =
  | 'Mới'
  | 'Đang tiếp nhận'
  | 'Chờ bổ sung'
  | 'Chờ phê duyệt'
  | 'Đang xử lý'
  | 'Hoàn tất'
  | 'Từ chối'

export type RequestPriority = 'Thường' | 'Ưu tiên' | 'Khẩn'

export type RequestCategory =
  | 'Thanh toán'
  | 'Tạm ứng & hoàn ứng'
  | 'Ngân sách'
  | 'Hóa đơn & chứng từ'
  | 'Mã dữ liệu tài chính'
  | 'Báo cáo & đối soát'
  | 'Tư vấn chính sách'

export interface TimelineEvent {
  id: string
  actor: string
  action: string
  detail: string
  at: string
  tone?: 'brand' | 'good' | 'warn' | 'muted'
}

export interface FinanceRequest {
  id: string
  code: string
  title: string
  description: string
  category: RequestCategory
  requestType: string
  requester: string
  contributorId: string
  department: string
  createdAt: string
  updatedAt: string
  dueAt: string
  status: RequestStatus
  priority: RequestPriority
  amount?: number
  currency: 'VND' | 'USD'
  assignee?: string
  approver?: string
  progress: number
  attachments: number
  expectedBenefit?: string
  visibility?: 'Công khai nội bộ' | 'Chỉ phòng ban' | 'Chỉ Phòng Tài chính'
  votes?: number
  comments?: number
  votedByCurrentUser?: boolean
  timeline: TimelineEvent[]
}

export interface CreateRequestInput {
  title: string
  description: string
  category: RequestCategory
  requestType: string
  department: string
  priority: RequestPriority
  amount?: number
  currency: 'VND' | 'USD'
  dueAt: string
  expectedBenefit?: string
  visibility?: 'Công khai nội bộ' | 'Chỉ phòng ban' | 'Chỉ Phòng Tài chính'
}

export interface RequestTypeDefinition {
  id: number
  code: string
  category: RequestCategory
  name: string
  slaHours: number
  requiresApproval: boolean
  description: string
  workflowSteps: string[]
}
