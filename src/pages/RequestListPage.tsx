import { useMemo, useState } from 'react'
import { Download, FilePlus2, Filter, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { RequestDetailDrawer } from '../components/RequestDetailDrawer'
import { RequestTable } from '../components/RequestTable'
import type { FinanceRequest, RequestStatus } from '../domain/types'
import { useRequests } from '../features/requests/RequestContext'
import { useAuth } from '../features/auth/AuthContext'

export function RequestListPage() {
  const { requests } = useRequests()
  const { user } = useAuth()
  const scopedRequests = user?.role === 'requester' ? requests.filter((request) => request.requester === user.fullName) : requests
  const [params] = useSearchParams()
  const [selected, setSelected] = useState<FinanceRequest | null>(() => scopedRequests.find((item) => item.id === params.get('created')) || null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<RequestStatus | 'Tất cả'>('Tất cả')
  const filtered = useMemo(() => scopedRequests.filter((request) => {
    const matchesText = `${request.code} ${request.title} ${request.category}`.toLowerCase().includes(search.toLowerCase())
    return matchesText && (status === 'Tất cả' || request.status === status)
  }), [scopedRequests, search, status])

  return (
    <>
      <section className="page-heading">
        <div><p>Đóng góp của tôi</p><h1>Theo dõi các ý kiến đã chia sẻ</h1><span>Xem phản hồi, tiếp tục trao đổi và cập nhật thêm thông tin khi cần.</span></div>
        <Link to="/new" className="button button-primary"><FilePlus2 size={17} />Chia sẻ ý kiến</Link>
      </section>
      <section className="summary-tabs">
        <button className="active">Tất cả <b>{scopedRequests.length}</b></button>
        <button>Đang trao đổi <b>{scopedRequests.filter((item) => !['Hoàn tất', 'Từ chối'].includes(item.status)).length}</b></button>
        <button>Cần thêm thông tin <b>{scopedRequests.filter((item) => item.status === 'Chờ bổ sung').length}</b></button>
        <button>Đã phản hồi <b>{scopedRequests.filter((item) => item.status === 'Hoàn tất').length}</b></button>
      </section>
      <section className="content-card list-card">
        <div className="list-toolbar">
          <label className="toolbar-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã, tiêu đề, nhóm..." /></label>
          <div><label className="select-control"><Filter size={15} /><select value={status} onChange={(event) => setStatus(event.target.value as RequestStatus | 'Tất cả')}><option value="Tất cả">Tất cả</option><option value="Mới">Mới chia sẻ</option><option value="Đang tiếp nhận">Đã ghi nhận</option><option value="Chờ bổ sung">Cần thêm thông tin</option><option value="Chờ phê duyệt">Đang đánh giá</option><option value="Đang xử lý">Đang xem xét</option><option value="Hoàn tất">Đã phản hồi</option></select></label><button className="button button-secondary"><Download size={15} />Xuất danh sách</button></div>
        </div>
        <RequestTable requests={filtered} onOpen={setSelected} />
        <footer className="table-footer"><span>Hiển thị {filtered.length}/{scopedRequests.length} ý kiến</span><div><button disabled>Trước</button><button className="active">1</button><button disabled>Sau</button></div></footer>
      </section>
      <RequestDetailDrawer request={selected} onClose={() => setSelected(null)} />
    </>
  )
}
