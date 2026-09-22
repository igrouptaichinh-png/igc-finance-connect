import { useState, type FormEvent } from 'react'
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'

export function PasswordSetupPage() {
  const { updatePassword, logout } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 8) return setError('Mật khẩu cần có ít nhất 8 ký tự.')
    if (password !== confirmPassword) return setError('Hai mật khẩu chưa khớp nhau.')
    setSubmitting(true)
    const message = await updatePassword(password)
    setError(message || '')
    setSubmitting(false)
  }

  return (
    <main className="password-page">
      <section className="password-card">
        <span className="login-lock"><KeyRound size={20} /></span>
        <p className="eyebrow">Kích hoạt tài khoản</p>
        <h1>Tạo mật khẩu của bạn</h1>
        <p>Email đã được xác nhận. Hãy đặt mật khẩu riêng trước khi vào IGC Finance Connect.</p>
        <form onSubmit={submit}>
          <label>Mật khẩu mới<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
          <label>Nhập lại mật khẩu<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="button button-primary login-submit" type="submit" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Hoàn tất kích hoạt'} {!submitting && <ArrowRight size={16} />}</button>
        </form>
        <div className="password-trust"><ShieldCheck size={16} />Mật khẩu được Supabase Auth bảo vệ và không hiển thị cho Finance Admin.</div>
        <button className="text-button" onClick={() => void logout()}>Đăng xuất để dùng tài khoản khác</button>
      </section>
    </main>
  )
}
