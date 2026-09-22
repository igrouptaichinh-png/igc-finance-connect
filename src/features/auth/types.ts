export type AppRole = 'requester' | 'finance_agent' | 'approver' | 'finance_admin'
export type AccountSource = 'demo' | 'supabase'

export interface AppUser {
  id: string
  fullName: string
  email: string
  departmentId: number | null
  department: string
  role: AppRole
  active: boolean
  source: AccountSource
  needsPasswordSetup?: boolean
}

export interface CreateAccountInput {
  fullName: string
  email: string
  departmentId: number | null
  department: string
  role: AppRole
}

export interface DepartmentOption {
  id: number
  code: string
  name: string
  active: boolean
}

export interface AccountUpdateInput {
  userId: string
  fullName: string
  departmentId: number
  role: AppRole
  active: boolean
}

export const roleLabels: Record<AppRole, string> = {
  requester: 'Người đóng góp',
  finance_agent: 'Người phụ trách',
  approver: 'Người đánh giá',
  finance_admin: 'Finance Admin',
}
