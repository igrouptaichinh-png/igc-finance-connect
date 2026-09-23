import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, LockKeyhole, ShieldCheck, UserRoundCog } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'

export function LoginPage() {
  const { authMessage, login, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [recoverySent, setRecoverySent] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    const message = await login(email, password)
    setError(message || '')
    setSubmitting(false)
  }

  async function sendRecovery(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const message = await resetPassword(email)
    setSubmitting(false)
    if (message) return setError(message)
    setRecoverySent(true)
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
          <h2>{recoveryMode ? 'Tạo hoặc đặt lại mật khẩu' : 'Đăng nhập'}</h2><p>{recoveryMode ? 'Nhập email công ty để nhận liên kết tạo mật khẩu mới.' : 'Dùng tài khoản công ty để tiếp tục vào hệ thống.'}</p>
          {recoveryMode ? <form onSubmit={sendRecovery}>
            <label>Email công ty<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            {recoverySent && <div className="recovery-success" role="status"><CheckCircle2 size={16} /><span><strong>Đã gửi hướng dẫn</strong><small>Vui lòng kiểm tra Inbox và Spam/Junk, sau đó mở liên kết trên cùng trình duyệt này.</small></span></div>}
            {error && <div className="login-error" role="alert">{error}</div>}
            {!recoverySent && <button className="button button-primary login-submit" type="submit" disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi email tạo mật khẩu'} {!submitting && <ArrowRight size={16} />}</button>}
            <button className="login-back" type="button" onClick={() => { setRecoveryMode(false); setRecoverySent(false); setError('') }}><ArrowLeft size={14} />Quay lại đăng nhập</button>
          </form> : <form onSubmit={submit}>
            <label>Email công ty<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
            <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {(error || authMessage) && <div className="login-error" role="alert">{error || authMessage}</div>}
            <button className="button button-primary login-submit" type="submit" disabled={submitting}>{submitting ? 'Đang xác thực...' : 'Đăng nhập'} {!submitting && <ArrowRight size={16} />}</button>
            <button className="password-help" type="button" onClick={() => { setRecoveryMode(true); setError('') }}><KeyRound size={14} />Chưa có hoặc quên mật khẩu?</button>
          </form>}
          <small className="login-security-note">Chỉ tài khoản công ty đã được Finance Admin cấp quyền mới có thể truy cập hệ thống.</small>
        </div>
      </section>
    </main>
  )
}
