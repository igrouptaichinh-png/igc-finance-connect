import { useState } from 'react'
import { ArrowRight, BookOpen, Calculator, FileDown, FileText, Landmark, ReceiptText, Search, ShieldCheck } from 'lucide-react'

const articles = [
  { icon: ReceiptText, category: 'Thanh toán', title: 'Checklist hồ sơ thanh toán nhà cung cấp', text: 'Hợp đồng, PO, biên bản nghiệm thu và hóa đơn hợp lệ.', time: '4 phút đọc' },
  { icon: Calculator, category: 'Hạch toán', title: 'Hướng dẫn chọn tài khoản GL và cost center', text: 'Nguyên tắc chọn mã cho các nhóm chi phí phổ biến.', time: '6 phút đọc' },
  { icon: Landmark, category: 'Ngân sách', title: 'Quy trình điều chỉnh và bổ sung ngân sách', text: 'Thẩm quyền, hạn mức và biểu mẫu cần sử dụng.', time: '5 phút đọc' },
  { icon: ShieldCheck, category: 'Chính sách', title: 'Quy định về tạm ứng và hoàn ứng', text: 'Thời hạn hoàn ứng, chứng từ và trường hợp ngoại lệ.', time: '7 phút đọc' },
]

export function KnowledgePage() {
  const [query, setQuery] = useState('')
  const filtered = articles.filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <section className="knowledge-hero"><BookOpen size={28} /><div><p>Kho kiến thức Tài chính</p><h1>Tìm hiểu trước khi chia sẻ ý kiến</h1><label><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm quy trình, chính sách hoặc biểu mẫu..." /></label><span>Phổ biến: thanh toán NCC · hoàn ứng · mã GL · ngân sách</span></div></section>
      <section className="resource-strip"><div><FileDown size={20} /><span><strong>Biểu mẫu tài chính</strong><small>Tải bộ biểu mẫu phiên bản mới nhất</small></span></div><button className="button button-secondary">Xem 12 biểu mẫu <ArrowRight size={15} /></button></section>
      <section className="article-section"><header><div><h2>Hướng dẫn được xem nhiều</h2><p>Nội dung do Phòng Tài chính quản lý</p></div></header><div className="article-grid">{filtered.map((article) => { const Icon = article.icon; return <article key={article.title}><div className="article-icon"><Icon size={22} /></div><span>{article.category}</span><h3>{article.title}</h3><p>{article.text}</p><footer><small><FileText size={13} />{article.time}</small><button>Chi tiết <ArrowRight size={14} /></button></footer></article> })}</div></section>
      <section className="faq-card content-card"><div><h2>Câu hỏi thường gặp</h2><p>Giải đáp nhanh các tình huống phổ biến.</p></div><div className="faq-list">{['Tôi có thể bổ sung thông tin sau khi chia sẻ không?', 'Làm thế nào để biết ai đang cùng trao đổi?', 'Khi nào một đề xuất được đưa vào đánh giá?'].map((item) => <button key={item}>{item}<ArrowRight size={15} /></button>)}</div></section>
    </>
  )
}
