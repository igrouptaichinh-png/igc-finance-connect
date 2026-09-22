import { useMemo, useState, type FormEvent } from 'react'
import { Filter, MailPlus, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { departments } from '../data/demo'
import { useAuth } from '../features/auth/AuthContext'
import { roleLabels, type AppRole } from '../features/auth/types'

export function AccountsPage() {
  const { accounts, addAccount, toggleAccount, user } = useAuth()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ fullName: '', email: '', department: departments[0], role: 'requester' as AppRole })
  const filtered = useMemo(() => accounts.filter((account) => `${account.fullName} ${account.email} ${account.department}`.toLowerCase().includes(search.toLowerCase())), [accounts, search])

  function submit(event: FormEvent) {
    event.preventDefault()
    const error = addAccount(form)
    if (error) return setNotice(error)
    setNotice('Đã tạo lời mời demo. Tài khoản thật sẽ gửi email mời qua Supabase Auth.')
    setForm({ fullName: '', email: '', department: departments[0], role: 'requester' })
    setShowForm(false)
  }

  return (
    <>
      <section className="page-heading"><div><p>Quản trị truy cập</p><h1>Tài khoản & phân quyền</h1><span>Mời thành viên, gán phòng ban và kiểm soát quyền truy cập Finance Connect.</span></div><button className="button button-primary" onClick={() => setShowForm((value) => !value)}><MailPlus size={16} />Mời thành viên</button></section>
      {showForm && <form className="account-form content-card" onSubmit={submit}>
        <header><div><h2>Tạo tài khoản demo</h2><p>Ở môi trường thật, người dùng sẽ nhận email để kích hoạt tài khoản.</p></div></header>
        <div className="account-form-grid"><label>Họ và tên<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label><label>Email công ty<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Phòng ban<select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}>{[...departments, 'Phòng Tài chính'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Vai trò<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AppRole })}><option value="requester">Người đóng góp</option><option value="finance_agent">Người phụ trách</option><option value="finance_admin">Finance Admin</option></select></label></div>
        <footer><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Hủy</button><button className="button button-primary" type="submit">Tạo lời mời</button></footer>
      </form>}
      {notice && <div className="account-notice"><ShieldCheck size={16} />{notice}<button onClick={() => setNotice('')}>Đóng</button></div>}
      <section className="account-stats"><article><span>Tổng tài khoản</span><strong>{accounts.length}</strong></article><article><span>Đang hoạt động</span><strong>{accounts.filter((item) => item.active).length}</strong></article><article><span>Người đóng góp</span><strong>{accounts.filter((item) => item.role === 'requester').length}</strong></article><article><span>Nhóm Tài chính</span><strong>{accounts.filter((item) => item.role !== 'requester').length}</strong></article></section>
      <section className="content-card account-table-card">
        <div className="list-toolbar"><label className="toolbar-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, email hoặc phòng ban..." /></label><button className="button button-secondary"><Filter size={15} />Tất cả vai trò</button></div>
        <div className="account-table"><div className="account-row account-row-head"><span>Thành viên</span><span>Phòng ban</span><span>Vai trò</span><span>Trạng thái</span><span>Thao tác</span></div>{filtered.map((account) => <div className="account-row" key={account.id}><span className="account-person"><i className="avatar">{account.fullName.split(' ').slice(-2).map((part) => part[0]).join('')}</i><span><strong>{account.fullName}</strong><small>{account.email}</small></span></span><span>{account.department}</span><span><b className={`role-pill ${account.role}`}>{roleLabels[account.role]}</b></span><span><b className={`state-pill ${account.active ? 'active' : 'locked'}`}>{account.active ? 'Đang hoạt động' : 'Tạm khóa'}</b></span><span><button className="icon-button" disabled={account.id === user?.id} title={account.active ? 'Khóa tài khoản' : 'Mở tài khoản'} onClick={() => toggleAccount(account.id)}>{account.active ? <UserX size={16} /> : <UserCheck size={16} />}</button></span></div>)}</div>
      </section>
    </>
  )
}
