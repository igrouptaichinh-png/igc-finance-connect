import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { demoRequests } from '../../data/demo'
import type { CreateRequestInput, FinanceRequest, RequestStatus } from '../../domain/types'
import { statusLabels } from '../../lib/copy'
import { useAuth } from '../auth/AuthContext'

const STORAGE_KEY = 'igc_finance_connect_contributions_v1'

interface RequestContextValue {
  requests: FinanceRequest[]
  createRequest: (input: CreateRequestInput) => FinanceRequest
  updateStatus: (id: string, status: RequestStatus, detail?: string) => void
  addComment: (id: string, message: string) => void
  resetDemo: () => void
}

const RequestContext = createContext<RequestContextValue | null>(null)

function loadRequests(): FinanceRequest[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as FinanceRequest[]) : demoRequests
  } catch {
    return demoRequests
  }
}

export function RequestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [requests, setRequests] = useState<FinanceRequest[]>(loadRequests)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  }, [requests])

  const value = useMemo<RequestContextValue>(() => ({
    requests,
    createRequest(input) {
      const now = new Date()
      const code = `FC-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getTime()).slice(-4)}`
      const request: FinanceRequest = {
        ...input,
        id: crypto.randomUUID(),
        code,
        requester: user?.fullName || 'Người dùng',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        status: 'Mới',
        progress: 8,
        attachments: 0,
        visibility: input.visibility || 'Công khai nội bộ',
        votes: 0,
        comments: 0,
        timeline: [{
          id: crypto.randomUUID(),
          actor: user?.fullName || 'Người dùng',
          action: 'Đã chia sẻ ý kiến',
          detail: 'Ý kiến đã được ghi nhận và gửi đến Phòng Tài chính.',
          at: now.toLocaleString('vi-VN'),
          tone: 'brand',
        }],
      }
      setRequests((current) => [request, ...current])
      return request
    },
    updateStatus(id, status, detail) {
      const now = new Date()
      const progressByStatus: Record<RequestStatus, number> = {
        'Mới': 8,
        'Đang tiếp nhận': 24,
        'Chờ bổ sung': 42,
        'Chờ phê duyệt': 76,
        'Đang xử lý': 62,
        'Hoàn tất': 100,
        'Từ chối': 100,
      }
      setRequests((current) => current.map((request) => request.id === id ? {
        ...request,
        status,
        progress: progressByStatus[status],
        updatedAt: now.toISOString(),
        timeline: [...request.timeline, {
          id: crypto.randomUUID(),
          actor: 'Trần Thu Hà',
          action: `Cập nhật: ${statusLabels[status]}`,
          detail: detail || 'Trạng thái trao đổi đã được cập nhật.',
          at: now.toLocaleString('vi-VN'),
          tone: status === 'Hoàn tất' ? 'good' : status === 'Từ chối' ? 'warn' : 'brand',
        }],
      } : request))
    },
    addComment(id, message) {
      const now = new Date()
      setRequests((current) => current.map((request) => request.id === id ? {
        ...request,
        updatedAt: now.toISOString(),
        timeline: [...request.timeline, {
          id: crypto.randomUUID(),
          actor: user?.fullName || 'Người dùng',
          action: 'Đã thêm trao đổi',
          detail: message,
          at: now.toLocaleString('vi-VN'),
          tone: 'muted',
        }],
      } : request))
    },
    resetDemo() {
      setRequests(demoRequests)
    },
  }), [requests, user])

  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook and provider intentionally share one feature boundary
export function useRequests() {
  const context = useContext(RequestContext)
  if (!context) throw new Error('useRequests must be used inside RequestProvider')
  return context
}
