export type AppRole = 'requester' | 'finance_agent' | 'finance_admin'

export interface AppUser {
  id: string
  fullName: string
  email: string
  department: string
  role: AppRole
  active: boolean
}

export interface CreateAccountInput {
  fullName: string
  email: string
  department: string
  role: AppRole
}

export const roleLabels: Record<AppRole, string> = {
  requester: 'Người đóng góp',
  finance_agent: 'Người phụ trách',
  finance_admin: 'Finance Admin',
}
