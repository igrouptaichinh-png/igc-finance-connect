import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCircle2, Mail, RefreshCw, Save, ShieldCheck, Smartphone, UsersRound, X } from 'lucide-react'
import { listNotificationRules, saveNotificationRules, type NotificationRule } from '../notifications/api'

const recipients: { key: keyof Pick<NotificationRule, 'notifyContributor' | 'notifyAssignee' | 'notifyReviewer' | 'notifyGroupLeads' | 'notifyAdmins'>; label: string }[] = [
  { key: 'notifyContributor', label: 'Người đóng góp' },
  { key: 'notifyAssignee', label: 'Người phụ trách' },
  { key: 'notifyReviewer', label: 'Người đánh giá' },
  { key: 'notifyGroupLeads', label: 'Trưởng nhóm' },
  { key: 'notifyAdmins', label: 'Finance Admin' },
]

export function NotificationsSettings() {
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRules(await listNotificationRules())
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể tải thiết lập thông báo.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- remote rules load after the settings section mounts
    void load()
  }, [load])
  const activeCount = useMemo(() => rules.filter((rule) => rule.inAppEnabled).length, [rules])

  const updateRule = <K extends keyof NotificationRule>(eventKey: NotificationRule['eventKey'], key: K, value: NotificationRule[K]) => {
    setRules((current) => current.map((rule) => rule.eventKey === eventKey ? { ...rule, [key]: value } : rule))
    setNotice(null)
  }

  const save = async () => {
    const invalid = rules.find((rule) => rule.inAppEnabled && !recipients.some(({ key }) => rule[key]))
    if (invalid) {
      setNotice({ tone: 'error', text: `Quy tắc “${invalid.label}” cần có ít nhất một nhóm người nhận.` })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      await saveNotificationRules(rules)
      await load()
      setNotice({ tone: 'success', text: 'Đã lưu cấu hình thông báo trong ứng dụng.' })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể lưu thiết lập thông báo.' })
    } finally {
      setSaving(false)
    }
  }

  return <>
    <header className="card-head notification-settings-head"><div><h2>Thông báo</h2><p>Chọn sự kiện và nhóm người sẽ nhận cập nhật từ Finance Connect.</p></div><span>{activeCount}/{rules.length} quy tắc đang bật</span></header>
    {notice && <div className={`account-notice settings-inline-notice ${notice.tone === 'error' ? 'error' : ''}`} role="status">{notice.tone === 'success' && <CheckCircle2 size={16} />}{notice.text}<button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X size={14} /></button></div>}
    <section className="notification-channel-grid">
      <article><i className="ready"><Smartphone size={18} /></i><span><strong>Trong ứng dụng</strong><small>Hiển thị tại biểu tượng chuông của từng tài khoản.</small></span><b>Đang hoạt động</b></article>
      <article className="pending"><i><Mail size={18} /></i><span><strong>Email công ty</strong><small>Cần kết nối SMTP hoặc Supabase Edge Function trước khi bật.</small></span><b>Chưa kết nối</b></article>
    </section>
    {loading ? <div className="settings-empty">Đang tải quy tắc thông báo...</div> : <div className="notification-rule-list">
      {rules.map((rule) => <article className={!rule.inAppEnabled ? 'inactive' : ''} key={rule.eventKey}>
        <header><i><BellRing size={17} /></i><span><strong>{rule.label}</strong><small>{rule.description}</small></span><label className="switch" title={rule.inAppEnabled ? 'Tắt thông báo' : 'Bật thông báo'}><input type="checkbox" checked={rule.inAppEnabled} onChange={(event) => updateRule(rule.eventKey, 'inAppEnabled', event.target.checked)} /><i /></label></header>
        <div className="notification-recipient-block"><div><UsersRound size={15} /><span><strong>Gửi đến</strong><small>Không gửi lại cho chính người vừa thực hiện thao tác.</small></span></div><div className="recipient-options">
          {recipients.map(({ key, label }) => <label key={key} className={!rule.inAppEnabled ? 'disabled' : ''}><input type="checkbox" disabled={!rule.inAppEnabled} checked={rule[key]} onChange={(event) => updateRule(rule.eventKey, key, event.target.checked)} /><span>{label}</span></label>)}
        </div></div>
      </article>)}
    </div>}
    <section className="notification-safety-note"><ShieldCheck size={17} /><span><strong>Quyền riêng tư được giữ nguyên</strong><small>Mỗi người chỉ đọc và đánh dấu đã xem thông báo của chính mình; chỉ Finance Admin được đổi quy tắc.</small></span></section>
    <footer className="notification-settings-footer"><button type="button" className="button button-secondary" disabled={loading || saving} onClick={() => void load()}><RefreshCw size={15} />Tải lại</button><button type="button" className="button button-primary" disabled={loading || saving || rules.length === 0} onClick={() => void save()}><Save size={15} />{saving ? 'Đang lưu...' : 'Lưu thiết lập'}</button></footer>
  </>
}
