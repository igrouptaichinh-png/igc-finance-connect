import { ArrowDownRight, ArrowUpRight, CalendarRange, CheckCircle2, Download, Gauge, RotateCcw } from 'lucide-react'
import { useRequests } from '../features/requests/RequestContext'

const categoryData = [
  { label: 'Thanh toán', value: 46, count: 38 },
  { label: 'Hóa đơn & chứng từ', value: 31, count: 26 },
  { label: 'Ngân sách', value: 22, count: 18 },
  { label: 'Báo cáo & đối soát', value: 18, count: 15 },
  { label: 'Tạm ứng & hoàn ứng', value: 14, count: 12 },
]
const weekly = [38, 52, 43, 67, 58, 78, 71, 88, 82, 95, 76, 91]

export function ReportsPage() {
  const { requests } = useRequests()
  return (
    <>
      <section className="page-heading"><div><p>Phân tích đóng góp</p><h1>Báo cáo kết nối Tài chính</h1><span>Theo dõi mức độ tham gia, thời gian phản hồi và các cải tiến theo phòng ban.</span></div><div className="heading-actions"><button className="button button-secondary"><CalendarRange size={16} />01/09 – 21/09/2026</button><button className="button button-primary"><Download size={16} />Xuất báo cáo</button></div></section>
      <section className="report-metrics">
        <article><span>Tổng ý kiến</span><strong className="num">142</strong><small className="good-text"><ArrowUpRight size={14} />12,4% so với tháng trước</small></article>
        <article><span>Phản hồi đúng hẹn</span><strong className="num">92,3%</strong><small className="good-text"><ArrowUpRight size={14} />3,1 điểm phần trăm</small></article>
        <article><span>Thời gian phản hồi TB</span><strong className="num">18,6h</strong><small className="good-text"><ArrowDownRight size={14} />2,4 giờ</small></article>
        <article><span>Đề xuất được áp dụng</span><strong className="num">34,2%</strong><small className="good-text"><ArrowUpRight size={14} />4,8 điểm phần trăm</small></article>
      </section>
      <section className="report-grid">
        <article className="content-card trend-card"><header className="card-head"><div><h2>Lượng ý kiến</h2><p>12 tuần gần nhất</p></div><span className="legend"><i />Ý kiến</span></header><div className="mini-chart">{weekly.map((value, index) => <div key={index}><span style={{ height: `${value}%` }} /><small>T{index + 1}</small></div>)}</div></article>
        <article className="content-card sla-card"><header className="card-head"><div><h2>Chất lượng phản hồi</h2><p>Theo cam kết hiện tại</p></div><Gauge size={19} /></header><div className="sla-gauge"><div><span>92%</span><small>Đúng hẹn</small></div></div><ul><li><i className="good" /><span>Đúng hẹn</span><strong>131</strong></li><li><i className="warn" /><span>Sắp đến hẹn</span><strong>7</strong></li><li><i className="bad" /><span>Chậm phản hồi</span><strong>4</strong></li></ul></article>
        <article className="content-card category-card"><header className="card-head"><div><h2>Ý kiến theo chủ đề</h2><p>Mức độ quan tâm</p></div></header><div className="horizontal-bars">{categoryData.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.value * 2}%` }} /></div><strong className="num">{item.count}</strong></div>)}</div></article>
        <article className="content-card team-card"><header className="card-head"><div><h2>Mức độ tham gia của nhóm Tài chính</h2><p>Tháng 9/2026</p></div></header><div className="team-list">{[
          ['Trần Thu Hà', 'Thanh toán & chứng từ', 36, 94], ['Vũ Thị Lan', 'Ngân sách & đối soát', 29, 90], ['Hoàng Ngọc Mai', 'Dữ liệu chủ & tư vấn', 24, 96],
        ].map(([name, role, count, sla], index) => <div key={String(name)}><span className={`avatar avatar-${index + 1}`}>{String(name).split(' ').slice(-2).map((x) => x[0]).join('')}</span><span><strong>{name}</strong><small>{role}</small></span><b>{count}<small> ý kiến</small></b><em>{sla}% đúng hẹn</em></div>)}</div></article>
      </section>
      <section className="report-note"><CheckCircle2 size={18} /><span><strong>Dữ liệu báo cáo mẫu</strong><small>Hiện có {requests.length} ý kiến demo. Các chỉ số tổng hợp sẽ tính từ Supabase sau khi kết nối.</small></span><button><RotateCcw size={15} />Làm mới</button></section>
    </>
  )
}
