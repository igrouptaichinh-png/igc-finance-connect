import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CreateRequestInput, FinanceRequest, RequestCategory, RequestPriority, RequestStatus, RequestTypeDefinition, TimelineEvent } from '../../domain/types'
import { statusLabels } from '../../lib/copy'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { friendlyContributionError, validateContribution } from './validation'

const statusFromDb: Record<string, RequestStatus> = {
  new: 'Mới', accepted: 'Đang tiếp nhận', needs_information: 'Chờ bổ sung',
  under_review: 'Chờ phê duyệt', in_progress: 'Đang xử lý', completed: 'Hoàn tất', not_applied: 'Từ chối',
}
const statusToDb = Object.fromEntries(Object.entries(statusFromDb).map(([key, value]) => [value, key])) as Record<RequestStatus, string>
const priorityFromDb: Record<string, RequestPriority> = { normal: 'Thường', significant: 'Ưu tiên', attention: 'Khẩn' }
const priorityToDb = Object.fromEntries(Object.entries(priorityFromDb).map(([key, value]) => [value, key])) as Record<RequestPriority, string>
const categoryFromDb: Record<string, RequestCategory> = {
  payment: 'Thanh toán', advance: 'Tạm ứng & hoàn ứng', budget: 'Ngân sách', invoice: 'Hóa đơn & chứng từ',
  master_data: 'Mã dữ liệu tài chính', reporting: 'Báo cáo & đối soát', policy_advice: 'Tư vấn chính sách',
}
const visibilityFromDb: Record<string, NonNullable<FinanceRequest['visibility']>> = {
  company: 'Công khai nội bộ', department: 'Chỉ phòng ban', finance_only: 'Chỉ Phòng Tài chính',
}
const visibilityToDb = Object.fromEntries(Object.entries(visibilityFromDb).map(([key, value]) => [value, key])) as Record<NonNullable<FinanceRequest['visibility']>, string>
const progressByStatus: Record<RequestStatus, number> = {
  'Mới': 8, 'Đang tiếp nhận': 24, 'Chờ bổ sung': 42, 'Chờ phê duyệt': 76,
  'Đang xử lý': 62, 'Hoàn tất': 100, 'Từ chối': 100,
}

interface TopicRow { id: number; code: string; category: string; name: string; description: string; response_hours: number; requires_review: boolean; workflow_steps: string[] | null }
interface ProfileRow { user_id: string; full_name: string }
interface DepartmentRow { id: number; name: string }
interface CommentRow { id: number; contribution_id: string; author_id: string; body: string; created_at: string }
interface EventRow { id: number; contribution_id: string; actor_id: string | null; event_type: string; detail: string; to_status: string | null; created_at: string }
interface ContributionRow {
  id: string; code: string; title: string; description: string; expected_benefit: string | null; topic_id: number
  contributor_id: string; department_id: number; status: string; priority: string; visibility: string
  related_amount: number | string | null; currency: 'VND' | 'USD'; assignee_id: string | null; reviewer_id: string | null
  response_due_at: string; created_at: string; updated_at: string
}

interface RequestContextValue {
  requests: FinanceRequest[]
  topics: RequestTypeDefinition[]
  isLoading: boolean
  error: string
  refresh: () => Promise<void>
  createRequest: (input: CreateRequestInput) => Promise<FinanceRequest>
  updateStatus: (id: string, status: RequestStatus, detail?: string) => Promise<void>
  addComment: (id: string, message: string) => Promise<void>
  toggleVote: (id: string) => Promise<void>
}

const RequestContext = createContext<RequestContextValue | null>(null)

function displayDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function eventAction(event: EventRow) {
  if (event.to_status && statusFromDb[event.to_status]) return `Cập nhật: ${statusLabels[statusFromDb[event.to_status]]}`
  return event.event_type.replaceAll('_', ' ')
}

export function RequestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [requests, setRequests] = useState<FinanceRequest[]>([])
  const [topicRows, setTopicRows] = useState<TopicRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setRequests([])
      setTopicRows([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError('')
    const [contributionResult, profileResult, topicResult, departmentResult, commentResult, voteResult, eventResult, attachmentResult] = await Promise.all([
      supabase.from('contributions').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('contribution_topics').select('id, code, category, name, description, response_hours, requires_review, workflow_steps').eq('is_active', true).order('id'),
      supabase.from('departments').select('id, name').eq('is_active', true),
      supabase.from('contribution_comments').select('id, contribution_id, author_id, body, created_at').order('created_at'),
      supabase.from('contribution_votes').select('contribution_id, voter_id'),
      supabase.from('contribution_events').select('id, contribution_id, actor_id, event_type, detail, to_status, created_at').order('created_at'),
      supabase.from('contribution_attachments').select('id, contribution_id'),
    ])
    const firstError = [contributionResult.error, profileResult.error, topicResult.error, departmentResult.error, commentResult.error, voteResult.error, eventResult.error, attachmentResult.error].find(Boolean)
    if (firstError) {
      setError(firstError.message)
      setRequests([])
      setIsLoading(false)
      return
    }

    const contributions = (contributionResult.data || []) as ContributionRow[]
    const profiles = (profileResult.data || []) as ProfileRow[]
    const dbTopics = (topicResult.data || []) as TopicRow[]
    const departments = (departmentResult.data || []) as DepartmentRow[]
    const comments = (commentResult.data || []) as CommentRow[]
    const events = (eventResult.data || []) as EventRow[]
    const votes = (voteResult.data || []) as { contribution_id: string; voter_id: string }[]
    const attachments = (attachmentResult.data || []) as { id: string; contribution_id: string }[]
    const profileMap = new Map(profiles.map((item) => [item.user_id, item.full_name]))
    const topicMap = new Map(dbTopics.map((item) => [item.id, item]))
    const departmentMap = new Map(departments.map((item) => [item.id, item.name]))

    setTopicRows(dbTopics)
    setRequests(contributions.map((row) => {
      const topic = topicMap.get(row.topic_id)
      const rowComments = comments.filter((item) => item.contribution_id === row.id)
      const rowEvents = events.filter((item) => item.contribution_id === row.id)
      const timeline: TimelineEvent[] = [
        { id: `created-${row.id}`, actor: profileMap.get(row.contributor_id) || 'Người đóng góp', action: 'Đã chia sẻ ý kiến', detail: 'Ý kiến đã được ghi nhận và gửi đến Phòng Tài chính.', at: displayDate(row.created_at), tone: 'brand' },
        ...rowEvents.map((item) => ({ id: `event-${item.id}`, actor: item.actor_id ? profileMap.get(item.actor_id) || 'Thành viên' : 'Hệ thống', action: eventAction(item), detail: item.detail || 'Trạng thái trao đổi đã được cập nhật.', at: displayDate(item.created_at), tone: item.to_status === 'completed' ? 'good' as const : item.to_status === 'not_applied' ? 'warn' as const : 'brand' as const })),
        ...rowComments.map((item) => ({ id: `comment-${item.id}`, actor: profileMap.get(item.author_id) || 'Thành viên', action: 'Đã thêm trao đổi', detail: item.body, at: displayDate(item.created_at), tone: 'muted' as const })),
      ]
      const status = statusFromDb[row.status] || 'Mới'
      return {
        id: row.id, code: row.code, title: row.title, description: row.description,
        category: categoryFromDb[topic?.category || 'payment'] || 'Thanh toán', requestType: topic?.name || 'Chủ đề khác',
        contributorId: row.contributor_id, requester: profileMap.get(row.contributor_id) || 'Người đóng góp',
        department: departmentMap.get(row.department_id) || 'Chưa gán phòng ban', createdAt: row.created_at, updatedAt: row.updated_at,
        dueAt: row.response_due_at, status, priority: priorityFromDb[row.priority] || 'Thường',
        amount: row.related_amount === null ? undefined : Number(row.related_amount), currency: row.currency,
        assignee: row.assignee_id ? profileMap.get(row.assignee_id) : undefined, approver: row.reviewer_id ? profileMap.get(row.reviewer_id) : undefined,
        progress: progressByStatus[status], attachments: attachments.filter((item) => item.contribution_id === row.id).length,
        expectedBenefit: row.expected_benefit || undefined, visibility: visibilityFromDb[row.visibility] || 'Công khai nội bộ',
        votes: votes.filter((item) => item.contribution_id === row.id).length, comments: rowComments.length,
        votedByCurrentUser: votes.some((item) => item.contribution_id === row.id && item.voter_id === user.id), timeline,
      }
    }))
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- remote data loading follows the authenticated session
    void refresh()
  }, [refresh])

  const topics = useMemo<RequestTypeDefinition[]>(() => topicRows.map((item) => ({
    id: item.id, code: item.code, category: categoryFromDb[item.category] || 'Thanh toán', name: item.name,
    slaHours: item.response_hours, requiresApproval: item.requires_review, description: item.description,
    workflowSteps: item.workflow_steps?.length ? item.workflow_steps : ['Ghi nhận ý kiến', 'Trao đổi và làm rõ', 'Phản hồi kết quả'],
  })), [topicRows])

  const value = useMemo<RequestContextValue>(() => ({
    requests, topics, isLoading, error, refresh,
    async createRequest(input) {
      if (!supabase || !user?.departmentId) throw new Error('Tài khoản chưa được gán phòng ban.')
      const validationError = validateContribution(input)
      if (validationError) throw new Error(validationError)
      const topic = topicRows.find((item) => item.name === input.requestType)
      if (!topic) throw new Error('Chủ đề đã chọn không còn hoạt động.')
      const now = new Date()
      const code = `FC-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getTime()).slice(-6)}`
      const { data, error: insertError } = await supabase.from('contributions').insert({
        code, title: input.title.trim(), description: input.description.trim(), expected_benefit: input.expectedBenefit?.trim() || null,
        topic_id: topic.id, contributor_id: user.id, department_id: user.departmentId, status: 'new',
        priority: priorityToDb[input.priority], visibility: visibilityToDb[input.visibility || 'Công khai nội bộ'],
        related_amount: input.amount ?? null, currency: input.currency, response_due_at: input.dueAt,
      }).select('id, created_at, updated_at').single()
      if (insertError) throw new Error(friendlyContributionError(insertError.message))
      await refresh()
      return {
        ...input, id: data.id, code, contributorId: user.id, requester: user.fullName, department: user.department,
        createdAt: data.created_at, updatedAt: data.updated_at, status: 'Mới', progress: 8, attachments: 0,
        visibility: input.visibility || 'Công khai nội bộ', votes: 0, comments: 0, votedByCurrentUser: false,
        timeline: [{ id: `created-${data.id}`, actor: user.fullName, action: 'Đã chia sẻ ý kiến', detail: 'Ý kiến đã được ghi nhận và gửi đến Phòng Tài chính.', at: displayDate(data.created_at), tone: 'brand' }],
      }
    },
    async updateStatus(id, status, detail) {
      if (!supabase || !user) throw new Error('Phiên đăng nhập không hợp lệ.')
      const { error: updateError } = await supabase.from('contributions').update({ status: statusToDb[status], ...(detail ? { outcome: detail } : {}) }).eq('id', id)
      if (updateError) throw new Error(updateError.message)
      if (detail) {
        const { error: commentError } = await supabase.from('contribution_comments').insert({ contribution_id: id, author_id: user.id, body: detail, is_finance_only: false })
        if (commentError) throw new Error(commentError.message)
      }
      await refresh()
    },
    async addComment(id, message) {
      if (!supabase || !user) throw new Error('Phiên đăng nhập không hợp lệ.')
      const { error: commentError } = await supabase.from('contribution_comments').insert({ contribution_id: id, author_id: user.id, body: message, is_finance_only: false })
      if (commentError) throw new Error(commentError.message)
      await refresh()
    },
    async toggleVote(id) {
      if (!supabase || !user) throw new Error('Phiên đăng nhập không hợp lệ.')
      const current = requests.find((item) => item.id === id)
      const query = current?.votedByCurrentUser
        ? supabase.from('contribution_votes').delete().eq('contribution_id', id).eq('voter_id', user.id)
        : supabase.from('contribution_votes').insert({ contribution_id: id, voter_id: user.id })
      const { error: voteError } = await query
      if (voteError) throw new Error(voteError.message)
      await refresh()
    },
  }), [error, isLoading, refresh, requests, topicRows, topics, user])

  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook and provider intentionally share one feature boundary
export function useRequests() {
  const context = useContext(RequestContext)
  if (!context) throw new Error('useRequests must be used inside RequestProvider')
  return context
}
