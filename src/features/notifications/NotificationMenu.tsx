import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, MessageSquareText, RefreshCw } from 'lucide-react'
import { listUserNotifications, markAllNotificationsRead, markNotificationRead, type UserNotification } from './api'

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second')
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour')
  return formatter.format(Math.round(hours / 24), 'day')
}

export function NotificationMenu() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await listUserNotifications())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải thông báo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- notifications load after the authenticated shell mounts
    void load()
  }, [load])
  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) void load()
  }

  const markRead = async (item: UserNotification) => {
    if (item.readAt) return
    try {
      await markNotificationRead(item.id)
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry))
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Không thể cập nhật thông báo.')
    }
  }

  const markAll = async () => {
    try {
      await markAllNotificationsRead()
      const now = new Date().toISOString()
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })))
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Không thể cập nhật thông báo.')
    }
  }

  return <div className="notification-menu-wrap">
    <button className={`icon-button notification-button ${open ? 'open' : ''}`} aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`} aria-expanded={open} onClick={toggle}>
      <Bell size={18} />{unreadCount > 0 && <b>{unreadCount > 9 ? '9+' : unreadCount}</b>}
    </button>
    {open && <section className="notification-popover" aria-label="Danh sách thông báo">
      <header><div><strong>Thông báo</strong><span>{unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã xem hết thông báo'}</span></div><button type="button" title="Làm mới" onClick={() => void load()}><RefreshCw size={14} /></button></header>
      {error && <div className="notification-error">{error}</div>}
      {loading ? <div className="notification-empty">Đang tải thông báo...</div> : items.length === 0 ? <div className="notification-empty"><Bell size={24} /><strong>Chưa có thông báo</strong><span>Các cập nhật liên quan đến bạn sẽ xuất hiện tại đây.</span></div> : <div className="notification-list">
        {items.map((item) => <button type="button" className={!item.readAt ? 'unread' : ''} key={item.id} onClick={() => void markRead(item)}>
          <i><MessageSquareText size={14} /></i><span><strong>{item.title}</strong><small>{item.message}</small><time>{relativeTime(item.createdAt)}</time></span>{!item.readAt && <em />}
        </button>)}
      </div>}
      {unreadCount > 0 && <footer><button type="button" onClick={() => void markAll()}><CheckCheck size={14} />Đánh dấu tất cả đã đọc</button></footer>}
    </section>}
  </div>
}
