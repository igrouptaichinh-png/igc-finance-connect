import { useState } from 'react'
import { ArrowUpDown, Clock3, Filter, Search, UsersRound } from 'lucide-react'
import { RequestDetailDrawer } from '../components/RequestDetailDrawer'
import { PriorityBadge, StatusBadge } from '../components/StatusBadge'
import type { FinanceRequest, RequestStatus } from '../domain/types'
import { useRequests } from '../features/requests/RequestContext'
import { formatDate, formatMoney, hoursUntil } from '../lib/format'

const columns: { title: string; statuses: RequestStatus[]; tone: string }[] = [
  { title: 'Mới chia sẻ', statuses: ['Mới', 'Đang tiếp nhận'], tone: 'blue' },
  { title: 'Đang xem xét', statuses: ['Đang xử lý'], tone: 'navy' },
  { title: 'Cần thêm thông tin', statuses: ['Chờ bổ sung'], tone: 'amber' },
  { title: 'Đang đánh giá', statuses: ['Chờ phê duyệt'], tone: 'purple' },
]

export function QueuePage() {
  const { requests, updateStatus } = useRequests()
  const [selected, setSelected] = useState<FinanceRequest | null>(null)
  const active = requests.filter((request) => !['Hoàn tất', 'Từ chối'].includes(request.status))
  const activeAssignees = new Set(active.map((request) => request.assignee).filter(Boolean)).size
  return (
    <>
      <section className="page-heading"><div><p>Không gian Tài chính</p><h1>Ý kiến chờ phản hồi</h1><span>Ghi nhận, phân loại và cùng các phòng ban trao đổi trên từng ý kiến.</span></div><div className="heading-stat"><UsersRound size={18} /><span><strong>{activeAssignees} người phụ trách</strong><small>đang được phân công</small></span></div></section>
      <div className="queue-toolbar"><label className="toolbar-search"><Search size={16} /><input placeholder="Tìm ý kiến..." /></label><div><button className="button button-secondary"><Filter size={15} />Bộ lọc</button><button className="button button-secondary"><ArrowUpDown size={15} />Sắp xếp theo ngày hẹn</button></div></div>
      <section className="queue-summary"><span><i className="blue" />{active.length} đang trao đổi</span><span><i className="red" />{active.filter((item) => hoursUntil(item.dueAt) < 0).length} chậm phản hồi</span><span><i className="amber" />{active.filter((item) => hoursUntil(item.dueAt) >= 0 && hoursUntil(item.dueAt) < 12).length} sắp đến ngày hẹn</span></section>
      <section className="kanban-board">
        {columns.map((column) => {
          const items = active.filter((item) => column.statuses.includes(item.status))
          return <div className="kanban-column" key={column.title}><header><span><i className={column.tone} />{column.title}</span><b>{items.length}</b></header><div className="kanban-list">{items.map((request) => {
            const hours = hoursUntil(request.dueAt)
            return <article className="kanban-card" key={request.id} onClick={() => setSelected(request)}><div className="kanban-code"><span>{request.code}</span><PriorityBadge priority={request.priority} /></div><h3>{request.title}</h3><p>{request.department} · {request.requester}</p>{request.amount && <strong className="kanban-amount num">{formatMoney(request.amount, request.currency)}</strong>}<div className="kanban-meta"><span className={hours < 0 ? 'bad-text' : hours < 12 ? 'warn-text' : ''}><Clock3 size={13} />{hours < 0 ? `Chậm ${Math.abs(hours)}h` : `Còn ${hours}h`}</span><span>{request.assignee?.split(' ').slice(-2).join(' ') || 'Chưa có người phụ trách'}</span></div><div className="kanban-progress"><i style={{ width: `${request.progress}%` }} /></div><select aria-label="Cập nhật trạng thái" value={request.status} onClick={(event) => event.stopPropagation()} onChange={(event) => void updateStatus(request.id, event.target.value as RequestStatus)}><option value="Mới">Mới chia sẻ</option><option value="Đang tiếp nhận">Đã ghi nhận</option><option value="Đang xử lý">Đang xem xét</option><option value="Chờ bổ sung">Cần thêm thông tin</option><option value="Chờ phê duyệt">Đang đánh giá</option><option value="Hoàn tất">Đã phản hồi</option></select></article>
          })}{!items.length && <div className="kanban-empty">Chưa có ý kiến</div>}</div></div>
        })}
      </section>
      <div className="queue-footnote"><StatusBadge status="Đang xử lý" /><span>Dữ liệu trực tiếp từ Supabase · Cập nhật lúc {formatDate(new Date().toISOString(), true)}</span></div>
      <RequestDetailDrawer request={selected} onClose={() => setSelected(null)} />
    </>
  )
}
