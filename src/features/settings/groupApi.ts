import type { AppRole } from '../auth/types'
import { roleLabels } from '../auth/types'
import { supabase } from '../../lib/supabase'
import { listContributionTopics, type ContributionTopic } from './api'

export type FinanceGroupRole = 'lead' | 'member'

export interface FinanceDirectoryUser {
  id: string
  fullName: string
  department: string
  role: AppRole
  roleLabel: string
}

export interface FinanceGroupMember {
  userId: string
  groupRole: FinanceGroupRole
}

export interface FinanceTopicAssignment {
  topicId: number
  primaryAssigneeId: string
  backupAssigneeId: string | null
}

export interface FinanceGroup {
  id: number
  code: string
  name: string
  description: string
  active: boolean
  members: FinanceGroupMember[]
  topics: FinanceTopicAssignment[]
}

export interface FinanceGroupInput extends Omit<FinanceGroup, 'id'> {
  id: number | null
}

export interface FinanceGroupDirectory {
  groups: FinanceGroup[]
  users: FinanceDirectoryUser[]
  topics: ContributionTopic[]
}

interface ProfileRow {
  user_id: string
  full_name: string
  role: AppRole
  departments: { name?: string } | { name?: string }[] | null
}

function client() {
  if (!supabase) throw new Error('Ứng dụng chưa kết nối Supabase.')
  return supabase
}

function friendlyGroupError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('finance_admin_required') || normalized.includes('row-level security') || normalized.includes('permission denied')) return 'Chỉ Finance Admin mới được thay đổi nhóm và phân quyền.'
  if (normalized.includes('active_group_requires_member')) return 'Nhóm đang hoạt động cần có ít nhất một thành viên.'
  if (normalized.includes('invalid_finance_group_member')) return 'Thành viên phải là tài khoản Tài chính đang hoạt động.'
  if (normalized.includes('topic_already_assigned') || normalized.includes('finance_topic_assignments_pkey')) return 'Một chủ đề đã được giao cho nhóm khác.'
  if (normalized.includes('finance_groups_code_key')) return 'Mã nhóm đã tồn tại.'
  if (normalized.includes('finance_groups_name_key')) return 'Tên nhóm đã tồn tại.'
  if (normalized.includes('distinct_assignees')) return 'Người thay thế phải khác người phụ trách chính.'
  if (normalized.includes('foreign key')) return 'Người phụ trách và người thay thế phải là thành viên của nhóm.'
  return 'Không thể lưu nhóm xử lý. Vui lòng kiểm tra thông tin và thử lại.'
}

export async function loadFinanceGroupDirectory(): Promise<FinanceGroupDirectory> {
  const [groupResult, memberResult, assignmentResult, profileResult, topics] = await Promise.all([
    client().from('finance_groups').select('id, code, name, description, is_active').order('name'),
    client().from('finance_group_members').select('group_id, user_id, group_role'),
    client().from('finance_topic_assignments').select('group_id, topic_id, primary_assignee_id, backup_assignee_id'),
    client().from('profiles').select('user_id, full_name, role, departments(name)').in('role', ['finance_agent', 'approver', 'finance_admin']).eq('is_active', true).order('full_name'),
    listContributionTopics(),
  ])
  const firstError = [groupResult.error, memberResult.error, assignmentResult.error, profileResult.error].find(Boolean)
  if (firstError) throw new Error(friendlyGroupError(firstError.message))

  const memberRows = (memberResult.data || []) as { group_id: number; user_id: string; group_role: FinanceGroupRole }[]
  const assignmentRows = (assignmentResult.data || []) as { group_id: number; topic_id: number; primary_assignee_id: string; backup_assignee_id: string | null }[]
  const groups = ((groupResult.data || []) as { id: number; code: string; name: string; description: string; is_active: boolean }[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    active: row.is_active,
    members: memberRows.filter((member) => member.group_id === row.id).map((member) => ({ userId: member.user_id, groupRole: member.group_role })),
    topics: assignmentRows.filter((assignment) => assignment.group_id === row.id).map((assignment) => ({ topicId: assignment.topic_id, primaryAssigneeId: assignment.primary_assignee_id, backupAssigneeId: assignment.backup_assignee_id })),
  }))
  const users = ((profileResult.data || []) as ProfileRow[]).map((row) => {
    const departmentRelation = Array.isArray(row.departments) ? row.departments[0] : row.departments
    return { id: row.user_id, fullName: row.full_name, department: departmentRelation?.name || 'Chưa gán phòng ban', role: row.role, roleLabel: roleLabels[row.role] }
  })
  return { groups, users, topics }
}

export async function saveFinanceGroup(input: FinanceGroupInput) {
  const { data, error } = await client().rpc('save_finance_group_configuration', {
    p_group_id: input.id,
    p_code: input.code.trim().toUpperCase(),
    p_name: input.name.trim(),
    p_description: input.description.trim(),
    p_is_active: input.active,
    p_members: input.members.map((member) => ({ user_id: member.userId, group_role: member.groupRole })),
    p_topics: input.topics.map((topic) => ({ topic_id: topic.topicId, primary_assignee_id: topic.primaryAssigneeId, backup_assignee_id: topic.backupAssigneeId || null })),
  })
  if (error) throw new Error(friendlyGroupError(error.message))
  return Number(data)
}
