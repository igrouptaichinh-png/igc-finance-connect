import { CalendarRange, CheckCircle2, Download, Gauge, RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import { useRequests } from '../features/requests/RequestContext'

export function ReportsPage() {
  const { requests, refresh } = useRequests()
  const completed = requests.filter((item) => item.status === 'Hoàn tất')
  const onTime = completed.filter((item) => new Date(item.updatedAt) <= new Date(item.dueAt)).length
  const onTimeRate = completed.length ? Math.round(onTime / completed.length * 100) : 0
  const averageHours = completed.length
    ? completed.reduce((sum, item) => sum + Math.max(0, new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime()), 0) / completed.length / 3600000
    : 0

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>()
    requests.forEach((item) => counts.set(item.category, (counts.get(item.category) || 0) + 1))
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const max = Math.max(1, ...sorted.map((item) => item[1]))
    return sorted.map(([label, count]) => ({ label, count, value: Math.round(count / max * 100) }))
  }, [requests])

  const weekly = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const end = new Date()
    end.setDate(end.getDate() - (11 - index) * 7)
    const start = new Date(end)
    start.setDate(end.getDate() - 6)
    const count = requests.filter((item) => {
      const created = new Date(item.createdAt)
      return created >= start && created <= end
    }).length
    return { label: `T${index + 1}`, count }
  }), [requests])
  const weeklyMax = Math.max(1, ...weekly.map((item) => item.count))

  const team = useMemo(() => {
    const counts = new Map<string, number>()
    requests.forEach((item) => { if (item.assignee) counts.set(item.assignee, (counts.get(item.assignee) || 0) + 1) })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [requests])

  return (
    <>
      <section className="page-heading"><div><p>Phân tích đóng góp</p><h1>Báo cáo kết nối Tài chính</h1><span>Theo dõi mức độ tham gia, thời gian phản hồi và các cải tiến theo dữ liệu thực tế.</span></div><div className="heading-actions"><button className="button button-secondary"><CalendarRange size={16} />Đến {new Intl.DateTimeFormat('vi-VN').format(new Date())}</button><button className="button button-primary"><Download size={16} />Xuất báo cáo</button></div></section>
      <section className="report-metrics">
        <article><span>Tổng ý kiến</span><strong className="num">{requests.length}</strong><small>Dữ liệu đang có trên hệ thống</small></article>
        <article><span>Phản hồi đúng hẹn</span><strong className="num">{onTimeRate}%</strong><small>{onTime}/{completed.length} ý kiến hoàn tất</small></article>
        <article><span>Thời gian phản hồi TB</span><strong className="num">{averageHours.toFixed(1)}h</strong><small>Tính trên ý kiến đã hoàn tất</small></article>
        <article><span>Đề xuất đã phản hồi</span><strong className="num">{requests.length ? Math.round(completed.length / requests.length * 100) : 0}%</strong><small>{completed.length} ý kiến hoàn tất</small></article>
      </section>
      <section className="report-grid">
        <article className="content-card trend-card"><header className="card-head"><div><h2>Lượng ý kiến</h2><p>12 tuần gần nhất</p></div><span className="legend"><i />Ý kiến</span></header><div className="mini-chart">{weekly.map((item) => <div key={item.label}><span style={{ height: `${Math.max(2, item.count / weeklyMax * 100)}%` }} /><small>{item.label}</small></div>)}</div></article>
        <article className="content-card sla-card"><header className="card-head"><div><h2>Chất lượng phản hồi</h2><p>Theo thời hạn trên từng ý kiến</p></div><Gauge size={19} /></header><div className="sla-gauge"><div><span>{onTimeRate}%</span><small>Đúng hẹn</small></div></div><ul><li><i className="good" /><span>Đúng hẹn</span><strong>{onTime}</strong></li><li><i className="bad" /><span>Quá hạn</span><strong>{completed.length - onTime}</strong></li><li><i className="warn" /><span>Đang xử lý</span><strong>{requests.length - completed.length}</strong></li></ul></article>
        <article className="content-card category-card"><header className="card-head"><div><h2>Ý kiến theo chủ đề</h2><p>Mức độ quan tâm</p></div></header><div className="horizontal-bars">{categoryData.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.value}%` }} /></div><strong className="num">{item.count}</strong></div>)}</div>{!categoryData.length && <div className="account-empty">Chưa có dữ liệu để tổng hợp.</div>}</article>
        <article className="content-card team-card"><header className="card-head"><div><h2>Mức độ tham gia của nhóm Tài chính</h2><p>Theo người phụ trách</p></div></header><div className="team-list">{team.map(([name, count], index) => <div key={name}><span className={`avatar avatar-${index + 1}`}>{name.split(' ').slice(-2).map((x) => x[0]).join('')}</span><span><strong>{name}</strong><small>Người phụ trách</small></span><b>{count}<small> ý kiến</small></b><em>Đang theo dõi</em></div>)}</div>{!team.length && <div className="account-empty">Chưa có ý kiến được phân công.</div>}</article>
      </section>
      <section className="report-note"><CheckCircle2 size={18} /><span><strong>Dữ liệu thật từ Supabase</strong><small>Hiện có {requests.length} ý kiến. Các chỉ số được tính trực tiếp từ dữ liệu đang lưu.</small></span><button onClick={() => void refresh()}><RotateCcw size={15} />Làm mới</button></section>
    </>
  )
}
