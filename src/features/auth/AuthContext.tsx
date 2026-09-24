import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { clearAuthCallbackFromUrl, initialAuthCallback, isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { AppRole, AppUser } from './types'

interface AuthContextValue {
  user: AppUser | null
  isLoading: boolean
  authMessage: string
  login: (email: string, password: string) => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  logout: () => Promise<void>
  updatePassword: (password: string) => Promise<string | null>
  hasRole: (...roles: AppRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Email hoặc mật khẩu chưa đúng.'
  if (normalized.includes('email not confirmed')) return 'Email chưa được xác nhận. Vui lòng mở email mời từ hệ thống.'
  if (normalized.includes('expired') || normalized.includes('invalid token') || normalized.includes('otp_expired')) return 'Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu gửi lại email mới.'
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
  const [realUser, setRealUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [authMessage, setAuthMessage] = useState('')
  const callbackIntent = useRef(initialAuthCallback.intent)
  const user = realUser

  const syncSession = useCallback(async (authUser: User | null, forcePasswordSetup = false) => {
    if (!authUser) {
      setRealUser(null)
      setIsLoading(false)
      return
    }
    try {
      const profile = await loadProfile(authUser)
      setRealUser(forcePasswordSetup ? { ...profile, needsPasswordSetup: true } : profile)
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
    localStorage.removeItem('igc_finance_demo_session_v1')
    localStorage.removeItem('igc_finance_demo_accounts_v2')
    localStorage.removeItem('igc_finance_connect_contributions_v1')
    if (!supabase) {
      // oxlint-disable-next-line react/set-state-in-effect -- configuration status is synchronized once on startup
      setAuthMessage('Ứng dụng chưa được kết nối với Supabase.')
      return
    }

    let mounted = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        setAuthMessage(friendlyAuthError(error.message))
        clearAuthCallbackFromUrl()
        setIsLoading(false)
        return
      }
      const authUser = data.session?.user || null
      const needsPasswordSetup = callbackIntent.current !== null
      if (!authUser && needsPasswordSetup) {
        callbackIntent.current = null
        setAuthMessage(initialAuthCallback.error
          ? friendlyAuthError(initialAuthCallback.error)
          : 'Không thể xác nhận liên kết. Liên kết có thể đã hết hạn hoặc đã được sử dụng; vui lòng yêu cầu gửi lại email mới.')
        clearAuthCallbackFromUrl()
        setIsLoading(false)
        return
      }
      if (authUser && needsPasswordSetup) {
        clearAuthCallbackFromUrl()
      }
      void syncSession(authUser, needsPasswordSetup)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      const needsPasswordSetup = event === 'PASSWORD_RECOVERY' || callbackIntent.current !== null
      window.setTimeout(() => {
        if (session?.user && needsPasswordSetup) {
          clearAuthCallbackFromUrl()
        }
        void syncSession(session?.user || null, needsPasswordSetup)
      }, 0)
    })

    if (initialAuthCallback.error) {
      setAuthMessage(friendlyAuthError(initialAuthCallback.error))
      clearAuthCallbackFromUrl()
    }
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [syncSession])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    authMessage,
    async login(email, password) {
      const normalized = email.trim().toLowerCase()
      if (!supabase) return 'Ứng dụng chưa được kết nối với Supabase.'

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
    async logout() {
      setRealUser(null)
      callbackIntent.current = null
      if (supabase) await supabase.auth.signOut()
    },
    async updatePassword(password) {
      if (!supabase || realUser?.source !== 'supabase') return 'Phiên đăng nhập không hợp lệ.'
      const pendingIntent = callbackIntent.current
      callbackIntent.current = null
      const { data, error } = await supabase.auth.updateUser({
        password,
        data: { needs_password_setup: false },
      })
      if (error) {
        callbackIntent.current = pendingIntent
        return friendlyAuthError(error.message)
      }
      await syncSession(data.user)
      return null
    },
    hasRole(...roles) {
      return Boolean(user && roles.includes(user.role))
    },
  }), [authMessage, isLoading, realUser, syncSession, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook and provider form one feature boundary
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
