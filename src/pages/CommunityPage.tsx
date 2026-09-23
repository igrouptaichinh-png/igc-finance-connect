import { useMemo, useState } from 'react'
import { ArrowRight, Heart, MessageCircle, Search, Sparkles, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RequestDetailDrawer } from '../components/RequestDetailDrawer'
import { StatusBadge } from '../components/StatusBadge'
import type { FinanceRequest } from '../domain/types'
import { useRequests } from '../features/requests/RequestContext'

export function CommunityPage() {
  const { requests, toggleVote } = useRequests()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<FinanceRequest | null>(null)
  const contributions = useMemo(() => requests.filter((item) => item.visibility !== 'Chỉ Phòng Tài chính' && `${item.title} ${item.category} ${item.department}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => (b.votes || 0) - (a.votes || 0)), [requests, query])

  return (
    <>
      <section className="community-hero"><div><span><UsersRound size={16} />Cộng đồng nội bộ</span><h1>Cùng chia sẻ để tài chính thuận tiện hơn</h1><p>Khám phá các góp ý từ đồng nghiệp, bổ sung góc nhìn và đồng tình với những đề xuất hữu ích.</p></div><Link to="/new" className="button button-primary"><Sparkles size={16} />Chia sẻ ý kiến</Link></section>
      <section className="community-toolbar"><label className="toolbar-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo chủ đề, nội dung hoặc phòng ban..." /></label><div><button className="active">Được quan tâm</button><button>Mới nhất</button><button>Đã phản hồi</button></div></section>
      <section className="community-grid">
        {contributions.map((item) => <article className="community-card" key={item.id}>
          <header><span className="request-code">{item.code}</span><StatusBadge status={item.status} /></header>
          <button className="community-title" onClick={() => setSelected(item)}><h2>{item.title}</h2><p>{item.description}</p></button>
          {item.expectedBenefit && <div className="benefit-note"><Sparkles size={14} /><span><strong>Lợi ích kỳ vọng</strong>{item.expectedBenefit}</span></div>}
          <footer><span><b>{item.requester}</b><small>{item.department}</small></span><div><button className={item.votedByCurrentUser ? 'voted' : ''} onClick={() => void toggleVote(item.id)}><Heart size={15} />{item.votes || 0}</button><button onClick={() => setSelected(item)}><MessageCircle size={15} />{item.comments || 0}</button><button onClick={() => setSelected(item)} aria-label={`Xem ${item.code}`}><ArrowRight size={15} /></button></div></footer>
        </article>)}
      </section>
      {!contributions.length && <div className="community-empty">Chưa tìm thấy ý kiến phù hợp. Hãy thử một chủ đề khác.</div>}
      <RequestDetailDrawer request={selected} onClose={() => setSelected(null)} />
    </>
  )
}
