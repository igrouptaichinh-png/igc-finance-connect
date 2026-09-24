import { useMemo, useState } from 'react'
import { ArrowUpDown, Building2, Clock3, Columns3, Search, Tags, UserRound, UsersRound } from 'lucide-react'
import { RequestDetailDrawer } from '../components/RequestDetailDrawer'
import { PriorityBadge, StatusBadge } from '../components/StatusBadge'
import type { FinanceRequest, RequestStatus } from '../domain/types'
import { useRequests } from '../features/requests/RequestContext'
import { formatDate, formatMoney, hoursUntil } from '../lib/format'

type QueueView = 'status' | 'assignee' | 'department' | 'topic'

interface QueueGroup {
  key: string
  title: string
  tone: string
  matches: (request: FinanceRequest) => boolean
}

const statusGroups: QueueGroup[] = [
  { key: 'new', title: 'Mới chia sẻ', tone: 'blue', matches: (request) => ['Mới', 'Đang tiếp nhận'].includes(request.status) },
  { key: 'in-progress', title: 'Đang xem xét', tone: 'navy', matches: (request) => request.status === 'Đang xử lý' },
  { key: 'needs-information', title: 'Cần thêm thông tin', tone: 'amber', matches: (request) => request.status === 'Chờ bổ sung' },
  { key: 'under-review', title: 'Đang đánh giá', tone: 'purple', matches: (request) => request.status === 'Chờ phê duyệt' },
]

const groupTones = ['blue', 'navy', 'amber', 'purple']

function queueGroupValue(request: FinanceRequest, view: Exclude<QueueView, 'status'>) {
  if (view === 'assignee') return request.assignee || 'Chưa có người phụ trách'
  if (view === 'department') return request.department
  return request.requestType
}

function requestSearchText(request: FinanceRequest) {
  return [request.code, request.title, request.requester, request.department, request.assignee, request.requestType, request.category]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('vi')
}

function cardContext(request: FinanceRequest, view: QueueView) {
  if (view === 'assignee') return `${request.department} · ${request.requestType}`
  if (view === 'department') return `${request.requestType} · ${request.requester}`
  return `${request.department} · ${request.requester}`
}

export function QueuePage() {
  const { requests, updateStatus } = useRequests()
  const [selected, setSelected] = useState<FinanceRequest | null>(null)
  const [view, setView] = useState<QueueView>('status')
  const [query, setQuery] = useState('')
  const [dueSoonestFirst, setDueSoonestFirst] = useState(true)

  const active = useMemo(() => requests.filter((request) => !['Hoàn tất', 'Từ chối'].includes(request.status)), [requests])
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    return active
      .filter((request) => !normalizedQuery || requestSearchText(request).includes(normalizedQuery))
      .sort((left, right) => {
        const comparison = new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
        return dueSoonestFirst ? comparison : -comparison
      })
  }, [active, dueSoonestFirst, query])

  const groups = useMemo<QueueGroup[]>(() => {
    if (view === 'status') return statusGroups
    const values = [...new Set(visible.map((request) => queueGroupValue(request, view)))]
      .sort((left, right) => {
        if (left === 'Chưa có người phụ trách') return 1
        if (right === 'Chưa có người phụ trách') return -1
        return left.localeCompare(right, 'vi')
      })
    return values.map((value, index) => ({
      key: `${view}-${value}`,
      title: value,
      tone: groupTones[index % groupTones.length],
      matches: (request) => queueGroupValue(request, view) === value,
    }))
  }, [view, visible])

  const activeAssignees = new Set(active.map((request) => request.assignee).filter(Boolean)).size

  return (
    <>
      <section className="page-heading"><div><p>Không gian Tài chính</p><h1>Ý kiến chờ phản hồi</h1><span>Ghi nhận, phân loại và cùng các phòng ban trao đổi trên từng ý kiến.</span></div><div className="heading-stat"><UsersRound size={18} /><span><strong>{activeAssignees} người phụ trách</strong><small>đang được phân công</small></span></div></section>
      <div className="queue-toolbar">
        <label className="toolbar-search"><Search size={16} /><input aria-label="Tìm ý kiến" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tiêu đề, người phụ trách..." /></label>
        <div><button type="button" className="button button-secondary" aria-label={dueSoonestFirst ? 'Đổi sang ngày hẹn xa nhất' : 'Đổi sang ngày hẹn gần nhất'} onClick={() => setDueSoonestFirst((current) => !current)}><ArrowUpDown size={15} />{dueSoonestFirst ? 'Ngày hẹn gần nhất' : 'Ngày hẹn xa nhất'}</button></div>
      </div>
      <nav className="queue-view-switcher" aria-label="Chọn cách nhóm ý kiến">
        <span>Xem theo</span>
        <div className="queue-view-options">
          <button type="button" className={view === 'status' ? 'active' : ''} aria-pressed={view === 'status'} onClick={() => setView('status')}><Columns3 size={15} />Trạng thái</button>
          <button type="button" className={view === 'assignee' ? 'active' : ''} aria-pressed={view === 'assignee'} onClick={() => setView('assignee')}><UserRound size={15} />Người phụ trách</button>
          <button type="button" className={view === 'department' ? 'active' : ''} aria-pressed={view === 'department'} onClick={() => setView('department')}><Building2 size={15} />Phòng ban</button>
          <button type="button" className={view === 'topic' ? 'active' : ''} aria-pressed={view === 'topic'} onClick={() => setView('topic')}><Tags size={15} />Chủ đề</button>
        </div>
        <small>{visible.length === active.length ? `${active.length} ý kiến` : `${visible.length}/${active.length} ý kiến phù hợp`}</small>
      </nav>
      <section className="queue-summary"><span><i className="blue" />{active.length} đang trao đổi</span><span><i className="red" />{active.filter((item) => hoursUntil(item.dueAt) < 0).length} chậm phản hồi</span><span><i className="amber" />{active.filter((item) => hoursUntil(item.dueAt) >= 0 && hoursUntil(item.dueAt) < 12).length} sắp đến ngày hẹn</span></section>
      {groups.length && !(query.trim() && visible.length === 0) ? <section className="kanban-board" data-view={view}>
        {groups.map((group) => {
          const items = visible.filter(group.matches)
          return <div className="kanban-column" key={group.key}><header><span><i className={group.tone} />{group.title}</span><b>{items.length}</b></header><div className="kanban-list">{items.map((request) => {
            const hours = hoursUntil(request.dueAt)
            return <article className="kanban-card" key={request.id} onClick={() => setSelected(request)}><div className="kanban-code"><span>{request.code}</span><PriorityBadge priority={request.priority} /></div><h3>{request.title}</h3><p>{cardContext(request, view)}</p>{request.amount && <strong className="kanban-amount num">{formatMoney(request.amount, request.currency)}</strong>}<div className="kanban-meta"><span className={hours < 0 ? 'bad-text' : hours < 12 ? 'warn-text' : ''}><Clock3 size={13} />{hours < 0 ? `Chậm ${Math.abs(hours)}h` : `Còn ${hours}h`}</span><span>{request.assignee?.split(' ').slice(-2).join(' ') || 'Chưa có người phụ trách'}</span></div><div className="kanban-progress"><i style={{ width: `${request.progress}%` }} /></div><select aria-label="Cập nhật trạng thái" value={request.status} onClick={(event) => event.stopPropagation()} onChange={(event) => void updateStatus(request.id, event.target.value as RequestStatus)}><option value="Mới">Mới chia sẻ</option><option value="Đang tiếp nhận">Đã ghi nhận</option><option value="Đang xử lý">Đang xem xét</option><option value="Chờ bổ sung">Cần thêm thông tin</option><option value="Chờ phê duyệt">Đang đánh giá</option><option value="Hoàn tất">Đã phản hồi</option></select></article>
          })}{!items.length && <div className="kanban-empty">Chưa có ý kiến</div>}</div></div>
        })}
      </section> : <div className="queue-board-empty"><Search size={20} /><strong>Không tìm thấy ý kiến phù hợp</strong><span>Hãy thử từ khóa khác hoặc xóa nội dung tìm kiếm.</span></div>}
      <div className="queue-footnote"><StatusBadge status="Đang xử lý" /><span>Dữ liệu trực tiếp từ Supabase · Cập nhật lúc {formatDate(new Date().toISOString(), true)}</span></div>
      <RequestDetailDrawer request={selected} onClose={() => setSelected(null)} />
    </>
  )
}
