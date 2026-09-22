import { ChevronRight, Paperclip } from 'lucide-react'
import type { FinanceRequest } from '../domain/types'
import { formatDate } from '../lib/format'
import { PriorityBadge, StatusBadge } from './StatusBadge'

export function RequestTable({ requests, onOpen, compact = false }: {
  requests: FinanceRequest[]
  onOpen: (request: FinanceRequest) => void
  compact?: boolean
}) {
  return (
    <div className="table-wrap">
      <table className="request-table">
        <thead>
          <tr>
            <th>Ý kiến đóng góp</th>
            {!compact && <th>Phòng ban</th>}
            <th>Trạng thái</th>
            {!compact && <th>Mức độ</th>}
            <th>Phản hồi dự kiến</th>
            <th aria-label="Mở" />
          </tr>
        </thead>
        <tbody>
          {requests.length ? requests.map((request) => (
            <tr key={request.id} onClick={() => onOpen(request)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onOpen(request)}>
              <td>
                <span className="request-code">{request.code}</span>
                <strong>{request.title}</strong>
                <span className="request-meta">{request.category}{request.attachments > 0 && <><Paperclip size={12} />{request.attachments}</>}</span>
              </td>
              {!compact && <td><span className="department-cell">{request.department}</span><small>{request.requester}</small></td>}
              <td><StatusBadge status={request.status} /></td>
              {!compact && <td><PriorityBadge priority={request.priority} /></td>}
              <td><span className="date-cell">{formatDate(request.dueAt)}</span></td>
              <td><button className="icon-button row-open" aria-label={`Mở ${request.code}`}><ChevronRight size={17} /></button></td>
            </tr>
          )) : (
            <tr><td colSpan={6}><div className="empty-row">Chưa có ý kiến nào phù hợp với bộ lọc.</div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
