import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, FilePlus2, Inbox, TimerReset, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { FinanceRequest } from '../domain/types'
import { useRequests } from '../features/requests/RequestContext'
import { formatDate, hoursUntil } from '../lib/format'
import { RequestDetailDrawer } from '../components/RequestDetailDrawer'
import { RequestTable } from '../components/RequestTable'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthContext'

export function DashboardPage() {
  const { requests } = useRequests()
  const { user } = useAuth()
  const [selected, setSelected] = useState<FinanceRequest | null>(null)
  const isRequester = user?.role === 'requester'
  const visibleRequests = isRequester ? requests.filter((item) => item.requester === user.fullName) : requests
  const stats = useMemo(() => ({
    open: visibleRequests.filter((item) => !['Hoàn tất', 'Từ chối'].includes(item.status)).length,
    waiting: visibleRequests.filter((item) => item.status === 'Chờ phê duyệt').length,
    overdue: visibleRequests.filter((item) => hoursUntil(item.dueAt) < 0 && !['Hoàn tất', 'Từ chối'].includes(item.status)).length,
    done: visibleRequests.filter((item) => item.status === 'Hoàn tất').length,
  }), [visibleRequests])
  const active = visibleRequests.filter((item) => !['Hoàn tất', 'Từ chối'].includes(item.status))
  const stageCounts = [
    { label: 'Mới chia sẻ', value: visibleRequests.filter((item) => item.status === 'Mới').length },
    { label: 'Đã ghi nhận', value: visibleRequests.filter((item) => item.status === 'Đang tiếp nhận').length },
    { label: 'Đang trao đổi', value: visibleRequests.filter((item) => ['Đang xử lý', 'Chờ bổ sung'].includes(item.status)).length },
    { label: 'Đang đánh giá', value: visibleRequests.filter((item) => item.status === 'Chờ phê duyệt').length },
    { label: 'Đã phản hồi', value: visibleRequests.filter((item) => item.status === 'Hoàn tất').length },
  ]

  return (
    <>
      <section className="page-heading dashboard-heading">
        <div><p>{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p><h1>Chào buổi sáng, {user?.fullName.split(' ').slice(-2).join(' ')}</h1><span>{isRequester ? 'Cùng chia sẻ để các quy trình tài chính ngày càng thuận tiện hơn.' : 'Lắng nghe, trao đổi và phản hồi các đóng góp từ những phòng ban.'}</span></div>
        <Link to={isRequester ? '/new' : '/queue'} className="button button-primary button-large">{isRequester ? <FilePlus2 size={18} /> : <Inbox size={18} />}{isRequester ? 'Chia sẻ ý kiến' : 'Xem ý kiến mới'}</Link>
      </section>

      <section className="process-rail card-surface">
        <div className="process-intro"><span>Hành trình đóng góp</span><strong>{active.length} ý kiến đang trao đổi</strong></div>
        <div className="process-stages">
          {stageCounts.map((stage, index) => <div className={`process-stage ${index === 4 ? 'complete' : ''}`} key={stage.label}><i>{stage.value}</i><span>{stage.label}</span>{index < 4 && <ArrowRight size={15} />}</div>)}
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card"><div className="metric-icon blue"><Inbox size={20} /></div><div><span>Đang trao đổi</span><strong className="num">{stats.open}</strong><small><TrendingUp size={13} />2 ý kiến mới hôm nay</small></div></article>
        <article className="metric-card"><div className="metric-icon amber"><Clock3 size={20} /></div><div><span>Đang đánh giá</span><strong className="num">{stats.waiting}</strong><small>Đang cân nhắc khả năng áp dụng</small></div></article>
        <article className="metric-card"><div className="metric-icon red"><AlertCircle size={20} /></div><div><span>Chậm phản hồi</span><strong className="num">{stats.overdue}</strong><small className="bad-text"><TimerReset size={13} />Cần chủ động trao đổi</small></div></article>
        <article className="metric-card"><div className="metric-icon green"><CheckCircle2 size={20} /></div><div><span>Đã phản hồi tuần này</span><strong className="num">{stats.done + 11}</strong><small>92% phản hồi đúng hẹn</small></div></article>
      </section>

      <section className="dashboard-grid">
        <article className="content-card wide-card">
          <header className="card-head"><div><h2>Ý kiến gần đây</h2><p>Những trao đổi mới nhất</p></div><Link to={isRequester ? '/my-requests' : '/community'} className="text-link">Xem tất cả <ArrowRight size={15} /></Link></header>
          <RequestTable requests={visibleRequests.slice(0, 5)} onOpen={setSelected} compact />
        </article>
        <aside className="content-card attention-card">
          <header className="card-head"><div><h2>{isRequester ? 'Đang được trao đổi' : 'Cần bạn phản hồi'}</h2><p>Theo thời gian phản hồi dự kiến</p></div><span className="count-chip">{active.length}</span></header>
          <div className="attention-list">
            {active.slice(0, 4).map((request) => {
              const hours = hoursUntil(request.dueAt)
              return <button key={request.id} onClick={() => setSelected(request)}><div><span>{request.code}</span><StatusBadge status={request.status} /></div><strong>{request.title}</strong><small className={hours < 0 ? 'bad-text' : hours < 12 ? 'warn-text' : ''}><Clock3 size={13} />{hours < 0 ? `Chậm phản hồi ${Math.abs(hours)} giờ` : `Dự kiến trong ${hours} giờ`} · {formatDate(request.dueAt)}</small></button>
            })}
          </div>
        </aside>
      </section>

      <section className="insight-strip">
        <div><span>{isRequester ? 'Gợi ý đóng góp' : 'Góc nhìn cải tiến'}</span><strong>{isRequester ? 'Một ví dụ thực tế sẽ giúp ý kiến của bạn dễ được thấu hiểu hơn.' : 'Chủ đề “Hóa đơn & chứng từ” đang nhận được nhiều góp ý nhất.'}</strong><p>{isRequester ? 'Hãy chia sẻ bối cảnh, điều chưa thuận tiện và lợi ích bạn mong muốn.' : 'Có thể mở một buổi trao đổi ngắn để cùng các phòng ban làm rõ những điểm chung.'}</p></div><Link to={isRequester ? '/community' : '/reports'} className="button button-secondary">{isRequester ? 'Khám phá ý kiến khác' : 'Xem phân tích chi tiết'}</Link>
      </section>
      <RequestDetailDrawer request={selected} onClose={() => setSelected(null)} />
    </>
  )
}
