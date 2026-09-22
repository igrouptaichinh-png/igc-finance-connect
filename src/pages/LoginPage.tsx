import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, UserRoundCog } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { roleLabels } from '../features/auth/types'

const demoIds = ['requester-minh-anh', 'agent-thu-ha', 'approver-ngoc-linh', 'admin-finance']

export function LoginPage() {
  const { accounts, authMessage, login, loginAs } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    const message = await login(email, password)
    setError(message || '')
    setSubmitting(false)
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><span className="brand-mark"><img src={`${import.meta.env.BASE_URL}brand/ntsf-logo.png`} alt="Nha Trang Seafoods" /></span><div><strong>IGC Finance Connect</strong><small>Cùng đóng góp · Cùng cải tiến</small></div></div>
        <div className="login-message"><span>Finance Collaboration Hub</span><h1>Cùng lắng nghe.<br />Cùng cải tiến.</h1><p>Không gian chung để nhân viên và Phòng Tài chính chia sẻ ý kiến, trao đổi và biến đóng góp thành những cải tiến thiết thực.</p></div>
        <div className="login-points"><span><CheckCircle2 size={17} />Chia sẻ cởi mở</span><span><ShieldCheck size={17} />Phản hồi minh bạch</span><span><UserRoundCog size={17} />Ghi nhận cải tiến</span></div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-lock"><LockKeyhole size={20} /></div>
          <h2>Đăng nhập</h2><p>Dùng tài khoản công ty để tiếp tục vào hệ thống.</p>
          <form onSubmit={submit}>
            <label>Email công ty<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
            <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {(error || authMessage) && <div className="login-error" role="alert">{error || authMessage}</div>}
            <button className="button button-primary login-submit" type="submit" disabled={submitting}>{submitting ? 'Đang xác thực...' : 'Đăng nhập'} {!submitting && <ArrowRight size={16} />}</button>
          </form>
          <div className="demo-divider"><span>Truy cập nhanh bản demo</span></div>
          <div className="demo-accounts">
            {demoIds.map((id) => { const account = accounts.find((item) => item.id === id); if (!account) return null; return <button key={account.id} onClick={() => loginAs(account.id)}><span className="avatar">{account.fullName.split(' ').slice(-2).map((part) => part[0]).join('')}</span><span><strong>{roleLabels[account.role]}</strong><small>{account.fullName}</small></span><ArrowRight size={15} /></button> })}
          </div>
          <small className="demo-note">Bản demo dùng mật khẩu chung <strong>demo123</strong>. Tài khoản thật được Finance Admin mời bằng email và phân quyền ngay trong ứng dụng.</small>
        </div>
      </section>
    </main>
  )
}
