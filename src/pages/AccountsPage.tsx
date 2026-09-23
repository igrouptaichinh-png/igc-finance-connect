import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { MailPlus, Pencil, RefreshCw, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { inviteAccount, loadAdminDirectory, updateAccount } from '../features/accounts/api'
import { useAuth } from '../features/auth/AuthContext'
import { roleLabels, type AppRole, type AppUser, type DepartmentOption } from '../features/auth/types'

const roleOptions = Object.entries(roleLabels) as [AppRole, string][]

interface AccountFormState {
  fullName: string
  email: string
  departmentId: string
  role: AppRole
}

const emptyForm: AccountFormState = { fullName: '', email: '', departmentId: '', role: 'requester' }

export function AccountsPage() {
  const { user } = useAuth()
  const [liveAccounts, setLiveAccounts] = useState<AppUser[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AccountFormState>(emptyForm)
  const accounts = liveAccounts

  const refreshDirectory = useCallback(async () => {
    setLoading(true)
    try {
      const directory = await loadAdminDirectory()
      setLiveAccounts(directory.accounts)
      setDepartmentOptions(directory.departments.filter((item) => item.active))
      setNotice(null)
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Không thể tải danh sách tài khoản.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- remote directory loading is intentionally synchronized with the authenticated admin session
    void refreshDirectory()
  }, [refreshDirectory])

  const filtered = useMemo(() => accounts.filter((account) => {
    const matchesText = `${account.fullName} ${account.email} ${account.department}`.toLowerCase().includes(search.toLowerCase())
    return matchesText && (roleFilter === 'all' || account.role === roleFilter)
  }), [accounts, roleFilter, search])

  function openInvite() {
    setEditing(null)
    setForm({ ...emptyForm, departmentId: departmentOptions[0]?.id.toString() || '' })
    setShowForm(true)
    setNotice(null)
  }

  function openEdit(account: AppUser) {
    setEditing(account)
    setForm({
      fullName: account.fullName,
      email: account.email,
      departmentId: account.departmentId?.toString() || '',
      role: account.role,
    })
    setShowForm(true)
    setNotice(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const departmentId = Number(form.departmentId)
      if (!departmentId) throw new Error('Vui lòng chọn phòng ban.')
      if (editing) {
        const saved = await updateAccount({ userId: editing.id, fullName: form.fullName, departmentId, role: form.role, active: editing.active })
        setLiveAccounts((items) => items.map((item) => item.id === saved.id ? saved : item))
        setNotice({ type: 'success', text: `Đã cập nhật quyền truy cập cho ${saved.fullName}.` })
      } else {
        await inviteAccount({ fullName: form.fullName, email: form.email, departmentId, role: form.role })
        await refreshDirectory()
        setNotice({ type: 'success', text: `Đã gửi email mời đến ${form.email.trim().toLowerCase()}.` })
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Không thể lưu tài khoản.' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleAccount(account: AppUser) {
    setSaving(true)
    try {
      const saved = await updateAccount({
        userId: account.id,
        fullName: account.fullName,
        departmentId: account.departmentId || 0,
        role: account.role,
        active: !account.active,
      })
      setLiveAccounts((items) => items.map((item) => item.id === saved.id ? saved : item))
      setNotice({ type: 'success', text: saved.active ? `Đã mở lại tài khoản ${saved.fullName}.` : `Đã tạm khóa tài khoản ${saved.fullName}.` })
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Không thể thay đổi trạng thái tài khoản.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className="page-heading"><div><p>Quản trị truy cập</p><h1>Tài khoản & phân quyền</h1><span>Mời thành viên, gán phòng ban và kiểm soát quyền truy cập ngay trong Finance Connect.</span></div><button className="button button-primary" onClick={openInvite}><MailPlus size={16} />Mời thành viên</button></section>
      {showForm && <form className="account-form content-card" onSubmit={submit}>
        <header><div><h2>{editing ? 'Cập nhật thành viên' : 'Mời thành viên mới'}</h2><p>{editing ? 'Thay đổi tên hiển thị, phòng ban hoặc vai trò.' : 'Người dùng sẽ nhận email kích hoạt và tự tạo mật khẩu.'}</p></div></header>
        <div className="account-form-grid">
          <label>Họ và tên<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label>
          <label>Email công ty<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} disabled={Boolean(editing)} required /></label>
          <label>Phòng ban<select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} required><option value="" disabled>Chọn phòng ban</option>{departmentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Vai trò<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AppRole })}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <footer><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Hủy</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Gửi lời mời'}</button></footer>
      </form>}
      {notice && <div className={`account-notice ${notice.type}`}><ShieldCheck size={16} />{notice.text}<button onClick={() => setNotice(null)}>Đóng</button></div>}
      <section className="account-stats"><article><span>Tổng tài khoản</span><strong>{accounts.length}</strong></article><article><span>Đang hoạt động</span><strong>{accounts.filter((item) => item.active).length}</strong></article><article><span>Người đóng góp</span><strong>{accounts.filter((item) => item.role === 'requester').length}</strong></article><article><span>Nhóm Tài chính</span><strong>{accounts.filter((item) => item.role !== 'requester').length}</strong></article></section>
      <section className="content-card account-table-card">
        <div className="list-toolbar"><label className="toolbar-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, email hoặc phòng ban..." /></label><select className="toolbar-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as AppRole | 'all')}><option value="all">Tất cả vai trò</option>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="button button-secondary" onClick={() => void refreshDirectory()} disabled={loading}><RefreshCw size={15} />Làm mới</button></div>
        {loading ? <div className="account-loading">Đang tải danh sách tài khoản an toàn...</div> : <div className="account-table"><div className="account-row account-row-head"><span>Thành viên</span><span>Phòng ban</span><span>Vai trò</span><span>Trạng thái</span><span>Thao tác</span></div>{filtered.map((account) => <div className="account-row" key={account.id}><span className="account-person"><i className="avatar">{account.fullName.split(' ').slice(-2).map((part) => part[0]).join('')}</i><span><strong>{account.fullName}</strong><small>{account.email}</small></span></span><span>{account.department}</span><span><b className={`role-pill ${account.role}`}>{roleLabels[account.role]}</b></span><span><b className={`state-pill ${account.active ? 'active' : 'locked'}`}>{account.active ? 'Đang hoạt động' : 'Tạm khóa'}</b></span><span className="account-actions"><button className="icon-button" title="Sửa phân quyền" onClick={() => openEdit(account)}><Pencil size={15} /></button><button className="icon-button" disabled={account.id === user?.id || saving} title={account.active ? 'Khóa tài khoản' : 'Mở tài khoản'} onClick={() => void toggleAccount(account)}>{account.active ? <UserX size={16} /> : <UserCheck size={16} />}</button></span></div>)}{filtered.length === 0 && <div className="account-empty">Không tìm thấy tài khoản phù hợp.</div>}</div>}
      </section>
    </>
  )
}
