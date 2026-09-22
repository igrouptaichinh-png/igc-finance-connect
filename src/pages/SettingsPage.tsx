import { BellRing, ChevronRight, Clock3, Database, GitBranch, LockKeyhole, Plus, RotateCcw, SlidersHorizontal, UsersRound } from 'lucide-react'
import { requestTypes } from '../data/demo'
import { useRequests } from '../features/requests/RequestContext'
import { isSupabaseConfigured } from '../lib/supabase'

export function SettingsPage() {
  const { resetDemo } = useRequests()
  return (
    <>
      <section className="page-heading"><div><p>Quản trị hệ thống</p><h1>Thiết lập Finance Connect</h1><span>Cấu hình chủ đề, thời gian phản hồi và quyền truy cập.</span></div><button className="button button-primary"><Plus size={16} />Thêm chủ đề</button></section>
      <section className="settings-layout">
        <aside className="settings-nav content-card">{[
          [SlidersHorizontal, 'Chủ đề đóng góp', 'Biểu mẫu và phản hồi'], [GitBranch, 'Quy trình đánh giá', 'Các bước và người phụ trách'], [UsersRound, 'Nhóm & phân quyền', 'Vai trò người dùng'], [BellRing, 'Thông báo', 'Email và nhắc việc'], [Database, 'Kết nối dữ liệu', 'Supabase và tích hợp'], [LockKeyhole, 'Bảo mật & nhật ký', 'RLS và audit trail'],
        ].map(([Icon, title, text], index) => { const Component = Icon as typeof SlidersHorizontal; return <button className={index === 0 ? 'active' : ''} key={String(title)}><Component size={18} /><span><strong>{String(title)}</strong><small>{String(text)}</small></span><ChevronRight size={15} /></button> })}</aside>
        <div className="settings-main content-card">
          <header className="card-head"><div><h2>Chủ đề đóng góp</h2><p>Xác định biểu mẫu, thời gian phản hồi và bước đánh giá.</p></div><span>{requestTypes.length} chủ đề đang hoạt động</span></header>
          <div className="request-type-list">{requestTypes.map((item, index) => <article key={item.name}><div className="type-order">{String(index + 1).padStart(2, '0')}</div><div><span>{item.category}</span><strong>{item.name}</strong><p>{item.description}</p></div><div className="type-rules"><span><Clock3 size={14} />{item.slaHours} giờ</span>{item.requiresApproval && <span className="approval-rule">Cần đánh giá</span>}</div><label className="switch"><input type="checkbox" defaultChecked /><i /></label><button className="icon-button"><ChevronRight size={17} /></button></article>)}</div>
        </div>
      </section>
      <section className="environment-card content-card"><div className={`environment-icon ${isSupabaseConfigured ? 'ready' : ''}`}><Database size={22} /></div><div><span>Môi trường dữ liệu</span><h3>{isSupabaseConfigured ? 'Supabase đã được cấu hình' : 'Bản xem trước đang dùng localStorage'}</h3><p>{isSupabaseConfigured ? 'Ứng dụng sẽ đọc dữ liệu từ dự án đã kết nối.' : 'Thêm VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY khi tạo môi trường thật.'}</p></div><button className="button button-secondary" onClick={() => { resetDemo(); window.location.reload() }}><RotateCcw size={15} />Khôi phục dữ liệu demo</button></section>
    </>
  )
}
