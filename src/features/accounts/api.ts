import { supabase } from '../../lib/supabase'
import type { AccountUpdateInput, AppRole, AppUser, DepartmentOption } from '../auth/types'

interface AdminDirectoryResponse {
  accounts: AppUser[]
  departments: DepartmentOption[]
}

interface InviteAccountInput {
  fullName: string
  email: string
  departmentId: number
  role: AppRole
}

interface FunctionResponse<T> {
  data?: T
  error?: string
}

async function invokeAdmin<T>(action: string, payload?: unknown): Promise<T> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình cho môi trường này.')

  const { data, error } = await supabase.functions.invoke<FunctionResponse<T>>('manage-accounts', {
    body: { action, payload },
  })

  if (error) {
    let message = error.message || 'Không thể kết nối dịch vụ quản trị tài khoản.'
    const response = 'context' in error ? error.context as Response | undefined : undefined
    if (response) {
      try {
        const body = await response.clone().json() as FunctionResponse<T>
        if (body.error) message = body.error
      } catch {
        // Keep the transport error when the response is not JSON.
      }
    }
    throw new Error(message)
  }

  if (!data || data.error) throw new Error(data?.error || 'Dịch vụ không trả về dữ liệu hợp lệ.')
  return data.data as T
}

export function loadAdminDirectory() {
  return invokeAdmin<AdminDirectoryResponse>('list')
}

export function inviteAccount(input: InviteAccountInput) {
  return invokeAdmin<AppUser>('invite', input)
}

export function updateAccount(input: AccountUpdateInput) {
  return invokeAdmin<AppUser>('update', input)
}
