import { useState } from 'react'
import { Check, CheckCircle2, Clock3, Eye, ShieldCheck, X } from 'lucide-react'
import { RequestDetailDrawer } from '../components/RequestDetailDrawer'
import type { FinanceRequest } from '../domain/types'
import { useRequests } from '../features/requests/RequestContext'
import { formatMoney } from '../lib/format'
import { PriorityBadge } from '../components/StatusBadge'

export function ApprovalsPage() {
  const { requests, updateStatus } = useRequests()
  const [selected, setSelected] = useState<FinanceRequest | null>(null)
  const pending = requests.filter((item) => item.status === 'Chờ phê duyệt')
  const decided = requests.filter((item) => ['Hoàn tất', 'Từ chối'].includes(item.status))
  return (
    <>
      <section className="page-heading"><div><p>Cùng cân nhắc giải pháp</p><h1>Đề xuất đang đánh giá</h1><span>Xem bối cảnh, lợi ích kỳ vọng và khả năng áp dụng trước khi phản hồi.</span></div><div className="approval-summary"><ShieldCheck size={22} /><span><strong>{pending.length} ý kiến</strong><small>đang chờ đánh giá</small></span></div></section>
      <section className="approval-layout">
        <div className="approval-list">
          {pending.map((request) => <article className="approval-card" key={request.id}>
            <div className="approval-main"><div className="approval-top"><span className="request-code">{request.code}</span><PriorityBadge priority={request.priority} /></div><h2>{request.title}</h2><p>{request.department} · {request.requester}</p><div className="approval-details"><div><span>Giá trị liên quan</span><strong className="num">{formatMoney(request.amount, request.currency)}</strong></div><div><span>Người phụ trách</span><strong>{request.assignee}</strong></div><div><span>Phản hồi dự kiến</span><strong><Clock3 size={14} />Còn 18 giờ</strong></div></div></div>
            <div className="approval-actions"><button className="button button-ghost" onClick={() => setSelected(request)}><Eye size={16} />Xem chi tiết</button><button className="button button-danger-soft" onClick={() => updateStatus(request.id, 'Từ chối', 'Đề xuất hiện chưa phù hợp để áp dụng; Phòng Tài chính đã ghi nhận để xem lại khi có điều kiện.')}><X size={16} />Chưa thể áp dụng</button><button className="button button-success" onClick={() => updateStatus(request.id, 'Hoàn tất', 'Đề xuất đã được ghi nhận để đưa vào kế hoạch cải tiến.')}><Check size={16} />Ghi nhận áp dụng</button></div>
          </article>)}
          {!pending.length && <div className="approval-empty"><CheckCircle2 size={40} /><h2>Đã xem hết đề xuất</h2><p>Hiện chưa có ý kiến nào cần đánh giá thêm.</p></div>}
        </div>
        <aside className="content-card approval-history"><header className="card-head"><div><h2>Phản hồi gần đây</h2><p>Kết quả đánh giá đề xuất</p></div></header>{decided.slice(0, 5).map((item) => <button key={item.id} onClick={() => setSelected(item)}><i className={item.status === 'Hoàn tất' ? 'good' : 'bad'}>{item.status === 'Hoàn tất' ? <Check size={13} /> : <X size={13} />}</i><span><strong>{item.title}</strong><small>{item.code} · {item.department}</small></span></button>)}</aside>
      </section>
      <RequestDetailDrawer request={selected} onClose={() => setSelected(null)} />
    </>
  )
}
