import { useState } from 'react'
import { ArrowRight, CheckCircle2, Lightbulb, Sparkles, TrendingUp } from 'lucide-react'
import { RequestDetailDrawer } from '../components/RequestDetailDrawer'
import type { FinanceRequest } from '../domain/types'
import { useRequests } from '../features/requests/RequestContext'

export function ImprovementsPage() {
  const { requests } = useRequests()
  const [selected, setSelected] = useState<FinanceRequest | null>(null)
  const completed = requests.filter((item) => item.status === 'Hoàn tất')
  const impacts = [
    { value: String(completed.length), label: 'ý kiến đã được phản hồi' },
    { value: String(new Set(completed.map((item) => item.contributorId)).size), label: 'người cùng đóng góp' },
    { value: String(new Set(completed.map((item) => item.department)).size), label: 'phòng ban cùng tham gia' },
  ]
  return (
    <>
      <section className="page-heading"><div><p>Từ ý kiến đến hành động</p><h1>Cải tiến đã áp dụng</h1><span>Ghi nhận những đóng góp đã tạo ra thay đổi tích cực trong hoạt động tài chính.</span></div><div className="heading-stat"><Sparkles size={18} /><span><strong>{new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date())}</strong><small>{completed.length} ý kiến đã phản hồi</small></span></div></section>
      <section className="impact-banner"><div><Lightbulb size={26} /><span><strong>Mỗi ý kiến đều có giá trị</strong><p>Phòng Tài chính công khai kết quả để người đóng góp biết điều gì đã thay đổi.</p></span></div>{impacts.map((item) => <article key={item.label}><strong>{item.value}</strong><span>{item.label}</span></article>)}</section>
      <section className="improvement-list">
        {completed.map((item, index) => <article className="improvement-card" key={item.id}>
          <div className="improvement-index"><CheckCircle2 size={20} /><span>{String(index + 1).padStart(2, '0')}</span></div>
          <div className="improvement-copy"><span>{item.category} · {item.code}</span><h2>{item.title}</h2><p>{item.expectedBenefit || item.description}</p><div><span>Đóng góp bởi <strong>{item.requester}</strong></span><span>Phòng ban <strong>{item.department}</strong></span></div></div>
          <aside><TrendingUp size={18} /><strong>Đã phản hồi</strong><span>{new Intl.DateTimeFormat('vi-VN').format(new Date(item.updatedAt))}</span><button onClick={() => setSelected(item)}>Xem câu chuyện <ArrowRight size={14} /></button></aside>
        </article>)}
      </section>
      {!completed.length && <div className="community-empty">Chưa có cải tiến nào được công bố.</div>}
      <RequestDetailDrawer request={selected} onClose={() => setSelected(null)} />
    </>
  )
}
