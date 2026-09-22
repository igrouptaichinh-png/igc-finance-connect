import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AppRole, AppUser, CreateAccountInput } from './types'

const SESSION_KEY = 'igc_finance_demo_session_v1'
const ACCOUNTS_KEY = 'igc_finance_demo_accounts_v1'

const seededAccounts: AppUser[] = [
  { id: 'requester-minh-anh', fullName: 'Nguyễn Minh Anh', email: 'minhanh@demo.igc.vn', department: 'Kho Vận & Logistics', role: 'requester', active: true },
  { id: 'agent-thu-ha', fullName: 'Trần Thu Hà', email: 'thuha@demo.igc.vn', department: 'Phòng Tài chính', role: 'finance_agent', active: true },
  { id: 'admin-finance', fullName: 'Lê Quang Huy', email: 'admin@demo.igc.vn', department: 'Phòng Tài chính', role: 'finance_admin', active: true },
  { id: 'requester-thanh-tung', fullName: 'Phạm Thanh Tùng', email: 'thanhtung@demo.igc.vn', department: 'Kinh doanh', role: 'requester', active: true },
  { id: 'agent-thi-lan', fullName: 'Vũ Thị Lan', email: 'thilan@demo.igc.vn', department: 'Phòng Tài chính', role: 'finance_agent', active: false },
]

interface AuthContextValue {
  user: AppUser | null
  accounts: AppUser[]
  login: (email: string, password: string) => string | null
  loginAs: (id: string) => void
  logout: () => void
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AppUser[]>(loadAccounts)
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY))
  const user = accounts.find((account) => account.id === userId && account.active) || null

  function persistAccounts(next: AppUser[]) {
    setAccounts(next)
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next))
  }

  const loginAs = useCallback((id: string) => {
    const account = accounts.find((item) => item.id === id && item.active)
    if (!account) return
    setUserId(account.id)
    localStorage.setItem(SESSION_KEY, account.id)
  }, [accounts])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    accounts,
    login(email, password) {
      const normalized = email.trim().toLowerCase()
      const account = accounts.find((item) => item.email.toLowerCase() === normalized)
      if (!account || password !== 'demo123') return 'Email hoặc mật khẩu demo chưa đúng.'
      if (!account.active) return 'Tài khoản này đang tạm khóa. Vui lòng liên hệ Finance Admin.'
      loginAs(account.id)
      return null
    },
    loginAs,
    logout() {
      setUserId(null)
      localStorage.removeItem(SESSION_KEY)
    },
    addAccount(input) {
      const email = input.email.trim().toLowerCase()
      if (accounts.some((item) => item.email.toLowerCase() === email)) return 'Email này đã có trong danh sách tài khoản.'
      const next = [{ ...input, email, id: crypto.randomUUID(), active: true }, ...accounts]
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
  }), [accounts, user, loginAs])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook and provider form one feature boundary
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
