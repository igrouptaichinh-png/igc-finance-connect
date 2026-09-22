import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { AppRole, AppUser, CreateAccountInput } from './types'

const SESSION_KEY = 'igc_finance_demo_session_v1'
const ACCOUNTS_KEY = 'igc_finance_demo_accounts_v2'

const seededAccounts: AppUser[] = [
  { id: 'requester-minh-anh', fullName: 'Nguyễn Minh Anh', email: 'minhanh@demo.igc.vn', departmentId: null, department: 'Kho Vận & Logistics', role: 'requester', active: true, source: 'demo' },
  { id: 'agent-thu-ha', fullName: 'Trần Thu Hà', email: 'thuha@demo.igc.vn', departmentId: null, department: 'Phòng Tài chính', role: 'finance_agent', active: true, source: 'demo' },
  { id: 'approver-ngoc-linh', fullName: 'Đỗ Ngọc Linh', email: 'ngoclinh@demo.igc.vn', departmentId: null, department: 'Phòng Tài chính', role: 'approver', active: true, source: 'demo' },
  { id: 'admin-finance', fullName: 'Lê Quang Huy', email: 'admin@demo.igc.vn', departmentId: null, department: 'Phòng Tài chính', role: 'finance_admin', active: true, source: 'demo' },
  { id: 'requester-thanh-tung', fullName: 'Phạm Thanh Tùng', email: 'thanhtung@demo.igc.vn', departmentId: null, department: 'Kinh doanh', role: 'requester', active: true, source: 'demo' },
  { id: 'agent-thi-lan', fullName: 'Vũ Thị Lan', email: 'thilan@demo.igc.vn', departmentId: null, department: 'Phòng Tài chính', role: 'finance_agent', active: false, source: 'demo' },
]

interface AuthContextValue {
  user: AppUser | null
  accounts: AppUser[]
  isLoading: boolean
  authMessage: string
  login: (email: string, password: string) => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  loginAs: (id: string) => void
  logout: () => Promise<void>
  updatePassword: (password: string) => Promise<string | null>
  addAccount: (input: CreateAccountInput) => string | null
  toggleAccount: (id: string) => void
  hasRole: (...roles: AppRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadAccounts() {
  try {
    const saved = localStorage.getItem(ACCOUNTS_KEY)
    return saved ? (JSON.parse(saved) as AppUser[]) : seededAccounts
  } catch {
    return seededAccounts
  }
}

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Email hoặc mật khẩu chưa đúng.'
  if (normalized.includes('email not confirmed')) return 'Email chưa được xác nhận. Vui lòng mở email mời từ hệ thống.'
  if (normalized.includes('rate limit')) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một chút rồi thử lại.'
  return 'Không thể đăng nhập lúc này. Vui lòng thử lại hoặc liên hệ Finance Admin.'
}

async function loadProfile(authUser: User): Promise<AppUser> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.')
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, department_id, role, is_active, departments(name)')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Tài khoản chưa có hồ sơ phân quyền.')
  if (!data.is_active) throw new Error('Tài khoản đang tạm khóa. Vui lòng liên hệ Finance Admin.')

  const relation = data.departments as unknown as { name?: string } | { name?: string }[] | null
  const department = Array.isArray(relation) ? relation[0]?.name : relation?.name
  return {
    id: data.user_id,
    fullName: data.full_name,
    email: authUser.email || '',
    departmentId: data.department_id,
    department: department || 'Chưa gán phòng ban',
    role: data.role as AppRole,
    active: data.is_active,
    source: 'supabase',
    needsPasswordSetup: authUser.user_metadata?.needs_password_setup === true,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AppUser[]>(loadAccounts)
  const [demoUserId, setDemoUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY))
  const [realUser, setRealUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [authMessage, setAuthMessage] = useState('')
  const demoUser = accounts.find((account) => account.id === demoUserId && account.active) || null
  const user = realUser || demoUser

  const syncSession = useCallback(async (authUser: User | null, forcePasswordSetup = false) => {
    if (!authUser) {
      setRealUser(null)
      setIsLoading(false)
      return
    }
    try {
      const profile = await loadProfile(authUser)
      setRealUser(forcePasswordSetup ? { ...profile, needsPasswordSetup: true } : profile)
      setDemoUserId(null)
      localStorage.removeItem(SESSION_KEY)
      setAuthMessage('')
    } catch (error) {
      setRealUser(null)
      setAuthMessage(error instanceof Error ? error.message : 'Không thể tải hồ sơ người dùng.')
      await supabase?.auth.signOut()
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) void syncSession(data.session?.user || null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) window.setTimeout(() => void syncSession(session?.user || null, event === 'PASSWORD_RECOVERY'), 0)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [syncSession])

  function persistAccounts(next: AppUser[]) {
    setAccounts(next)
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next))
  }

  const loginAs = useCallback((id: string) => {
    const account = accounts.find((item) => item.id === id && item.active)
    if (!account) return
    void supabase?.auth.signOut()
    setRealUser(null)
    setDemoUserId(account.id)
    localStorage.setItem(SESSION_KEY, account.id)
    setAuthMessage('')
  }, [accounts])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    accounts,
    isLoading,
    authMessage,
    async login(email, password) {
      const normalized = email.trim().toLowerCase()
      const demoAccount = accounts.find((item) => item.email.toLowerCase() === normalized)
      if (demoAccount) {
        if (password !== 'demo123') return 'Email hoặc mật khẩu demo chưa đúng.'
        if (!demoAccount.active) return 'Tài khoản này đang tạm khóa.'
        loginAs(demoAccount.id)
        return null
      }
      if (!supabase) return 'Môi trường này chưa kết nối Supabase. Bạn có thể dùng tài khoản demo bên dưới.'

      setIsLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password })
      if (error) {
        setIsLoading(false)
        return friendlyAuthError(error.message)
      }
      await syncSession(data.user)
      return null
    },
    async resetPassword(email) {
      if (!supabase) return 'Môi trường này chưa kết nối Supabase.'
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
      if (error) return friendlyAuthError(error.message)
      return null
    },
    loginAs,
    async logout() {
      setRealUser(null)
      setDemoUserId(null)
      localStorage.removeItem(SESSION_KEY)
      if (supabase) await supabase.auth.signOut()
    },
    async updatePassword(password) {
      if (!supabase || realUser?.source !== 'supabase') return 'Phiên đăng nhập không hợp lệ.'
      const { data, error } = await supabase.auth.updateUser({
        password,
        data: { needs_password_setup: false },
      })
      if (error) return error.message
      await syncSession(data.user)
      return null
    },
    addAccount(input) {
      const email = input.email.trim().toLowerCase()
      if (accounts.some((item) => item.email.toLowerCase() === email)) return 'Email này đã có trong danh sách tài khoản.'
      const next: AppUser[] = [{ ...input, email, id: crypto.randomUUID(), active: true, source: 'demo' }, ...accounts]
      persistAccounts(next)
      return null
    },
    toggleAccount(id) {
      if (id === user?.id) return
      persistAccounts(accounts.map((item) => item.id === id ? { ...item, active: !item.active } : item))
    },
    hasRole(...roles) {
      return Boolean(user && roles.includes(user.role))
    },
  }), [accounts, authMessage, isLoading, loginAs, realUser, syncSession, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook and provider form one feature boundary
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
