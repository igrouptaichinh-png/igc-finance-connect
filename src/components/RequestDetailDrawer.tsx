import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, FileText, MessageSquare, Paperclip, Send, UserRound, X } from 'lucide-react'
import type { FinanceRequest, RequestStatus } from '../domain/types'
import { formatDate, formatMoney } from '../lib/format'
import { useRequests } from '../features/requests/RequestContext'
import { PriorityBadge, StatusBadge } from './StatusBadge'
import { statusLabels } from '../lib/copy'

const nextStatus: Partial<Record<RequestStatus, RequestStatus>> = {
  'Mới': 'Đang tiếp nhận',
  'Đang tiếp nhận': 'Đang xử lý',
  'Chờ bổ sung': 'Đang xử lý',
  'Đang xử lý': 'Chờ phê duyệt',
  'Chờ phê duyệt': 'Hoàn tất',
}

export function RequestDetailDrawer({ request, onClose }: { request: FinanceRequest | null; onClose: () => void }) {
  const { requests, updateStatus, addComment } = useRequests()
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const current = requests.find((item) => item.id === request?.id) ?? request

  useEffect(() => {
    if (!request) return
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [request, onClose])

  if (!current) return null
  const advance = nextStatus[current.status]

  const submitComment = async () => {
    if (!comment.trim()) return
    setBusy(true)
    setError('')
    try {
      await addComment(current.id, comment.trim())
      setComment('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gửi trao đổi.')
    } finally {
      setBusy(false)
    }
  }

  const advanceStatus = async () => {
    if (!advance) return
    setBusy(true)
    setError('')
    try { await updateStatus(current.id, advance) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật trạng thái.') }
    finally { setBusy(false) }
  }

  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" aria-label="Đóng chi tiết" onClick={onClose} />
      <aside className="request-drawer" role="dialog" aria-modal="true" aria-label={`Chi tiết ${current.code}`}>
        <header className="drawer-head">
          <div><span className="request-code">{current.code}</span><h2>{current.title}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
        </header>

        <div className="drawer-status-line">
          <StatusBadge status={current.status} />
          <PriorityBadge priority={current.priority} />
          <span className="drawer-sla"><Clock3 size={14} />Dự kiến phản hồi {formatDate(current.dueAt, true)}</span>
        </div>

        <div className="progress-block">
          <div><span>Mức độ trao đổi</span><strong>{current.progress}%</strong></div>
          <div className="progress-track"><i style={{ width: `${current.progress}%` }} /></div>
        </div>

        <section className="drawer-section">
          <h3>Thông tin đóng góp</h3>
          <div className="detail-grid">
            <div><span>Chủ đề cụ thể</span><strong>{current.requestType}</strong></div>
            <div><span>Phòng ban</span><strong>{current.department}</strong></div>
            <div><span>Người đóng góp</span><strong>{current.requester}</strong></div>
            <div><span>Giá trị liên quan</span><strong className="num">{formatMoney(current.amount, current.currency)}</strong></div>
            <div><span>Người phụ trách</span><strong>{current.assignee || 'Chưa phân công'}</strong></div>
            <div><span>Người đánh giá</span><strong>{current.approver || 'Chưa cần đánh giá'}</strong></div>
          </div>
          <div className="description-box"><FileText size={17} /><p>{current.description}</p></div>
          <div className="attachment-summary"><Paperclip size={15} />{current.attachments ? `${current.attachments} tệp đính kèm` : 'Chưa có tệp đính kèm'}</div>
        </section>

        <section className="drawer-section timeline-section">
          <h3>Dòng trao đổi</h3>
          <div className="timeline">
            {[...current.timeline].reverse().map((event) => (
              <article key={event.id} className={`timeline-event tone-${event.tone || 'muted'}`}>
                <i />
                <div><div className="timeline-title"><strong>{event.action}</strong><time>{event.at}</time></div><p>{event.detail}</p><span>{event.actor}</span></div>
              </article>
            ))}
          </div>
        </section>

        <section className="drawer-section comment-section">
          <h3><MessageSquare size={16} />Trao đổi</h3>
          <div className="comment-box">
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Chia sẻ thêm thông tin hoặc trao đổi cùng Phòng Tài chính..." />
            <button className="button button-primary button-icon-text" onClick={() => void submitComment()} disabled={busy}><Send size={15} />Gửi</button>
          </div>
          {error && <div className="account-notice error">{error}</div>}
        </section>

        <footer className="drawer-actions">
          <button className="button button-secondary"><UserRound size={16} />Chọn người phụ trách</button>
          {advance && <button className="button button-primary" disabled={busy} onClick={() => void advanceStatus()}><CheckCircle2 size={16} />Chuyển sang {statusLabels[advance].toLowerCase()}</button>}
        </footer>
      </aside>
    </div>
  )
}
