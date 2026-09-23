import { supabase } from '../../lib/supabase'

export type NotificationEventKey = 'contribution_created' | 'status_changed' | 'comment_added'

export interface NotificationRule {
  eventKey: NotificationEventKey
  label: string
  description: string
  inAppEnabled: boolean
  emailEnabled: boolean
  notifyContributor: boolean
  notifyAssignee: boolean
  notifyReviewer: boolean
  notifyGroupLeads: boolean
  notifyAdmins: boolean
}

export interface UserNotification {
  id: number
  contributionId: string | null
  eventKey: NotificationEventKey
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

interface RuleRow {
  event_key: NotificationEventKey
  label: string
  description: string
  in_app_enabled: boolean
  email_enabled: boolean
  notify_contributor: boolean
  notify_assignee: boolean
  notify_reviewer: boolean
  notify_group_leads: boolean
  notify_admins: boolean
}

interface NotificationRow {
  id: number
  contribution_id: string | null
  event_key: NotificationEventKey
  title: string
  message: string
  read_at: string | null
  created_at: string
}

function client() {
  if (!supabase) throw new Error('Ứng dụng chưa kết nối Supabase.')
  return supabase
}

function friendlyNotificationError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('finance_admin_required') || normalized.includes('row-level security') || normalized.includes('permission denied')) return 'Chỉ Finance Admin mới được thay đổi thiết lập thông báo.'
  if (normalized.includes('invalid_notification_rules') || normalized.includes('notification_rules_recipient_check')) return 'Mỗi quy tắc đang bật cần có ít nhất một nhóm người nhận.'
  return 'Không thể cập nhật thông báo. Vui lòng thử lại.'
}

function mapRule(row: RuleRow): NotificationRule {
  return {
    eventKey: row.event_key,
    label: row.label,
    description: row.description,
    inAppEnabled: row.in_app_enabled,
    emailEnabled: row.email_enabled,
    notifyContributor: row.notify_contributor,
    notifyAssignee: row.notify_assignee,
    notifyReviewer: row.notify_reviewer,
    notifyGroupLeads: row.notify_group_leads,
    notifyAdmins: row.notify_admins,
  }
}

function mapNotification(row: NotificationRow): UserNotification {
  return {
    id: row.id,
    contributionId: row.contribution_id,
    eventKey: row.event_key,
    title: row.title,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export async function listNotificationRules() {
  const { data, error } = await client()
    .from('notification_rules')
    .select('event_key, label, description, in_app_enabled, email_enabled, notify_contributor, notify_assignee, notify_reviewer, notify_group_leads, notify_admins')
    .order('event_key')
  if (error) throw new Error(friendlyNotificationError(error.message))
  return ((data || []) as RuleRow[]).map(mapRule)
}

export async function saveNotificationRules(rules: NotificationRule[]) {
  const { error } = await client().rpc('save_notification_rules', {
    p_rules: rules.map((rule) => ({
      event_key: rule.eventKey,
      in_app_enabled: rule.inAppEnabled,
      email_enabled: rule.emailEnabled,
      notify_contributor: rule.notifyContributor,
      notify_assignee: rule.notifyAssignee,
      notify_reviewer: rule.notifyReviewer,
      notify_group_leads: rule.notifyGroupLeads,
      notify_admins: rule.notifyAdmins,
    })),
  })
  if (error) throw new Error(friendlyNotificationError(error.message))
}

export async function listUserNotifications(limit = 20) {
  const { data, error } = await client()
    .from('user_notifications')
    .select('id, contribution_id, event_key, title, message, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(friendlyNotificationError(error.message))
  return ((data || []) as NotificationRow[]).map(mapNotification)
}

export async function markNotificationRead(id: number) {
  const { error } = await client().from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(friendlyNotificationError(error.message))
}

export async function markAllNotificationsRead() {
  const { error } = await client().from('user_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  if (error) throw new Error(friendlyNotificationError(error.message))
}
