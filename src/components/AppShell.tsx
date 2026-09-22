import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, BookOpenText, CheckSquare2, ChevronDown, CircleHelp,
  FilePlus2, Inbox, LayoutDashboard, LogOut, Menu, Moon, Search, Settings2,
  ShieldCheck, Sparkles, Sun, TicketCheck, UserCog, UsersRound, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { roleLabels, type AppRole } from '../features/auth/types'
import { useRequests } from '../features/requests/RequestContext'
import { isSupabaseConfigured } from '../lib/supabase'

interface NavItem { to: string; label: string; icon: LucideIcon; roles: AppRole[]; accent?: boolean; count?: number }
interface NavGroup { section: string; items: NavItem[] }

const nav: NavGroup[] = [
  { section: 'Không gian làm việc', items: [
    { to: '/', label: 'Tổng quan', icon: LayoutDashboard, roles: ['requester', 'finance_agent', 'finance_admin'] },
    { to: '/new', label: 'Chia sẻ ý kiến', icon: FilePlus2, roles: ['requester', 'finance_admin'], accent: true },
    { to: '/my-requests', label: 'Đóng góp của tôi', icon: TicketCheck, roles: ['requester', 'finance_admin'], count: 4 },
    { to: '/community', label: 'Cộng đồng đóng góp', icon: UsersRound, roles: ['requester', 'finance_agent', 'finance_admin'] },
  ] },
  { section: 'Kết nối Tài chính', items: [
    { to: '/queue', label: 'Ý kiến chờ phản hồi', icon: Inbox, roles: ['finance_agent', 'finance_admin'], count: 5 },
    { to: '/approvals', label: 'Đánh giá đề xuất', icon: CheckSquare2, roles: ['finance_agent', 'finance_admin'], count: 1 },
    { to: '/improvements', label: 'Cải tiến đã áp dụng', icon: Sparkles, roles: ['requester', 'finance_agent', 'finance_admin'] },
    { to: '/knowledge', label: 'Kho kiến thức', icon: BookOpenText, roles: ['requester', 'finance_agent', 'finance_admin'] },
  ] },
  { section: 'Quản trị', items: [
    { to: '/reports', label: 'Báo cáo', icon: BarChart3, roles: ['finance_agent', 'finance_admin'] },
    { to: '/accounts', label: 'Tài khoản & phân quyền', icon: UsersRound, roles: ['finance_admin'] },
    { to: '/settings', label: 'Thiết lập', icon: Settings2, roles: ['finance_admin'] },
  ] },
]

const pageNames: Record<string, string> = {
  '/': 'Tổng quan', '/new': 'Chia sẻ ý kiến', '/my-requests': 'Đóng góp của tôi',
  '/community': 'Cộng đồng đóng góp', '/queue': 'Ý kiến chờ phản hồi', '/approvals': 'Đánh giá đề xuất', '/improvements': 'Cải tiến đã áp dụng', '/knowledge': 'Kho kiến thức',
  '/reports': 'Báo cáo', '/accounts': 'Tài khoản & phân quyền', '/settings': 'Thiết lập',
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, accounts, loginAs, logout } = useAuth()
  const { requests } = useRequests()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('igc_finance_theme') || 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('igc_finance_theme', theme)
  }, [theme])

  if (!user) return null
  const initials = user.fullName.split(' ').slice(-2).map((part) => part[0]).join('')
  const visibleGroups = nav.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(user.role)) })).filter((group) => group.items.length)

  function switchAccount(id: string) {
    loginAs(id)
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-veil" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-block">
          <span className="brand-mark"><img src={`${import.meta.env.BASE_URL}brand/ntsf-logo.png`} alt="Nha Trang Seafoods" /></span>
          <div><strong>IGC Finance Connect</strong><span>Cùng đóng góp · Cùng cải tiến</span></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <nav className="side-nav">
          {visibleGroups.map((group) => (
            <div className="nav-group" key={group.section}>
              <div className="nav-label">{group.section}</div>
              {group.items.map((item) => {
                const Icon = item.icon
                const count = item.to === '/my-requests'
                  ? requests.filter((request) => request.requester === user.fullName).length
                  : item.to === '/queue'
                    ? requests.filter((request) => !['Hoàn tất', 'Từ chối'].includes(request.status)).length
                    : item.to === '/approvals'
                      ? requests.filter((request) => request.status === 'Chờ phê duyệt').length
                      : item.count
                return <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${item.accent ? 'accent' : ''}`}>
                  <Icon size={18} /><span>{item.label}</span>{typeof count === 'number' && <b>{count}</b>}
                </NavLink>
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={`data-status ${isSupabaseConfigured ? 'online' : ''}`}><i /><span><strong>{isSupabaseConfigured ? 'Hạ tầng Supabase sẵn sàng' : 'Chế độ dữ liệu demo'}</strong><small>{isSupabaseConfigured ? 'Demo vẫn lưu trên trình duyệt' : 'Lưu trên trình duyệt này'}</small></span></div>
          <button className="help-link"><CircleHelp size={17} />Hướng dẫn sử dụng</button>
        </div>
      </aside>

      <div className="app-area">
        <header className="topbar">
          <div className="topbar-title"><button className="menu-button" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div><span>Finance Collaboration Hub</span><strong>{pageNames[location.pathname] || 'IGC Finance Connect'}</strong></div></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={17} /><input aria-label="Tìm kiếm toàn cục" placeholder="Tìm mã hoặc chủ đề..." /><kbd>Ctrl K</kbd></label>
            <button className="icon-button" title="Đổi giao diện" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-button notification-button" aria-label="Thông báo"><Bell size={18} /><i /></button>
            <div className="user-menu-wrap">
              <button className={`user-menu ${userMenuOpen ? 'open' : ''}`} onClick={() => setUserMenuOpen((value) => !value)} aria-expanded={userMenuOpen}><span className="avatar">{initials}</span><span><strong>{user.fullName}</strong><small>{roleLabels[user.role]}</small></span><ChevronDown size={15} /></button>
              {userMenuOpen && <div className="user-popover">
                <header><span className="avatar">{initials}</span><span><strong>{user.fullName}</strong><small>{user.email}</small></span></header>
                <div className="current-role"><ShieldCheck size={15} /><span><small>Vai trò hiện tại</small><strong>{roleLabels[user.role]}</strong></span></div>
                <div className="role-switch"><span>Chuyển vai trò demo</span>{accounts.filter((account) => account.active && ['requester-minh-anh', 'agent-thu-ha', 'admin-finance'].includes(account.id) && account.id !== user.id).map((account) => <button key={account.id} onClick={() => switchAccount(account.id)}><UserCog size={15} /><span><strong>{roleLabels[account.role]}</strong><small>{account.fullName}</small></span></button>)}</div>
                <button className="logout-button" onClick={() => { logout(); setUserMenuOpen(false) }}><LogOut size={15} />Đăng xuất</button>
              </div>}
            </div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
