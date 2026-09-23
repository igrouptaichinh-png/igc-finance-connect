import { BookOpen, FileDown, Search } from 'lucide-react'
import { useState } from 'react'

export function KnowledgePage() {
  const [query, setQuery] = useState('')
  return (
    <>
      <section className="knowledge-hero"><BookOpen size={28} /><div><p>Kho kiến thức Tài chính</p><h1>Tìm hiểu trước khi chia sẻ ý kiến</h1><label><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm quy trình, chính sách hoặc biểu mẫu..." /></label><span>Nội dung chính thức do Phòng Tài chính quản lý</span></div></section>
      <section className="resource-strip"><div><FileDown size={20} /><span><strong>Biểu mẫu tài chính</strong><small>Chưa có biểu mẫu nào được công bố</small></span></div><button className="button button-secondary" disabled>0 biểu mẫu</button></section>
      <section className="article-section"><header><div><h2>Hướng dẫn tài chính</h2><p>Kết quả tìm kiếm: {query || 'tất cả nội dung'}</p></div></header><div className="community-empty">Chưa có bài viết chính thức. Finance Admin có thể bổ sung nội dung ở bước triển khai Kho kiến thức.</div></section>
      <section className="faq-card content-card"><div><h2>Câu hỏi thường gặp</h2><p>Chưa có câu hỏi nào được công bố.</p></div></section>
    </>
  )
}
