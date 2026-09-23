import type { RequestCategory } from '../../domain/types'
import { supabase } from '../../lib/supabase'

export interface ContributionTopic {
  id: number
  code: string
  category: RequestCategory
  name: string
  description: string
  responseHours: number
  requiresReview: boolean
  active: boolean
  workflowSteps: string[]
}

export type TopicInput = Omit<ContributionTopic, 'id'>

const categoryFromDb: Record<string, RequestCategory> = {
  payment: 'Thanh toán',
  advance: 'Tạm ứng & hoàn ứng',
  budget: 'Ngân sách',
  invoice: 'Hóa đơn & chứng từ',
  master_data: 'Mã dữ liệu tài chính',
  reporting: 'Báo cáo & đối soát',
  policy_advice: 'Tư vấn chính sách',
}

const categoryToDb = Object.fromEntries(Object.entries(categoryFromDb).map(([key, value]) => [value, key])) as Record<RequestCategory, string>

interface TopicRow {
  id: number
  code: string
  category: string
  name: string
  description: string
  response_hours: number
  requires_review: boolean
  is_active: boolean
  workflow_steps: string[] | null
}

function ensureClient() {
  if (!supabase) throw new Error('Ứng dụng chưa kết nối Supabase.')
  return supabase
}

function mapRow(row: TopicRow): ContributionTopic {
  return {
    id: row.id,
    code: row.code,
    category: categoryFromDb[row.category] || 'Thanh toán',
    name: row.name,
    description: row.description,
    responseHours: row.response_hours,
    requiresReview: row.requires_review,
    active: row.is_active,
    workflowSteps: row.workflow_steps?.length ? row.workflow_steps : ['Ghi nhận ý kiến', 'Trao đổi và làm rõ', 'Phản hồi kết quả'],
  }
}

function toPayload(input: TopicInput) {
  return {
    code: input.code.trim().toUpperCase(),
    category: categoryToDb[input.category],
    name: input.name.trim(),
    description: input.description.trim(),
    response_hours: input.responseHours,
    requires_review: input.requiresReview,
    is_active: input.active,
    workflow_steps: input.workflowSteps.map((step) => step.trim()).filter(Boolean),
  }
}

function friendlyTopicError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('row-level security') || normalized.includes('permission denied')) return 'Chỉ Finance Admin mới được thay đổi thiết lập.'
  if (normalized.includes('contribution_topics_code_key')) return 'Mã chủ đề đã tồn tại.'
  if (normalized.includes('contribution_topics_name_key')) return 'Tên chủ đề đã tồn tại.'
  if (normalized.includes('contribution_topics_code_check')) return 'Mã chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.'
  if (normalized.includes('contribution_topics_workflow_steps_check')) return 'Quy trình cần từ 2 đến 8 bước.'
  return 'Không thể lưu thiết lập. Vui lòng kiểm tra thông tin và thử lại.'
}

export async function listContributionTopics() {
  const { data, error } = await ensureClient()
    .from('contribution_topics')
    .select('id, code, category, name, description, response_hours, requires_review, is_active, workflow_steps')
    .order('id')
  if (error) throw new Error(friendlyTopicError(error.message))
  return ((data || []) as TopicRow[]).map(mapRow)
}

export async function createContributionTopic(input: TopicInput) {
  const { data, error } = await ensureClient()
    .from('contribution_topics')
    .insert(toPayload(input))
    .select('id, code, category, name, description, response_hours, requires_review, is_active, workflow_steps')
    .single()
  if (error) throw new Error(friendlyTopicError(error.message))
  return mapRow(data as TopicRow)
}

export async function updateContributionTopic(id: number, input: TopicInput) {
  const { data, error } = await ensureClient()
    .from('contribution_topics')
    .update(toPayload(input))
    .eq('id', id)
    .select('id, code, category, name, description, response_hours, requires_review, is_active, workflow_steps')
    .single()
  if (error) throw new Error(friendlyTopicError(error.message))
  return mapRow(data as TopicRow)
}

export async function setContributionTopicActive(topic: ContributionTopic, active: boolean) {
  return updateContributionTopic(topic.id, { ...topic, active })
}
