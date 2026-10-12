import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import api from '../api/axiosInstance'

const recordPaths = { lead: 'leads', contact: 'contacts', account: 'accounts', deal: 'deals', task: 'tasks' }

function NotificationsPage() {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async (targetPage) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/crm/notifications/', { params: { page: targetPage } })
      const records = Array.isArray(data) ? data : data.results || []
      setItems(records)
      setUnreadCount(data.unread_count ?? records.filter((item) => !item.is_read).length)
      setHasNext(Boolean(data.next))
      setHasPrevious(Boolean(data.previous))
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page) }, [page])

  const markRead = async (item) => {
    if (item.is_read) return
    setError('')
    try {
      await api.patch(`/crm/notifications/${item.id}/read/`)
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row))
      setUnreadCount((count) => Math.max(0, count - 1))
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to update notification.')
    }
  }

  const markAllRead = async () => {
    setError('')
    setNotice('')
    try {
      await api.post('/crm/notifications/read-all/')
      setItems((current) => current.map((row) => ({ ...row, is_read: true })))
      setUnreadCount(0)
      setNotice('All notifications marked as read.')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to update notifications.')
    }
  }

  return (
    <section className="min-h-[calc(100vh-65px)] bg-[#eef4fb] p-5 sm:p-7">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Personal inbox</p>
          <h1 className="text-2xl font-semibold text-slate-800">Notifications <span className="text-base font-medium text-slate-500">{unreadCount} unread</span></h1>
        </div>
        <button onClick={markAllRead} disabled={!unreadCount} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <CheckCheck size={16} aria-hidden="true" /> Mark all read
        </button>
      </header>
      {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading notifications...</p> : items.length === 0 ? <div className="p-10 text-center"><Bell className="mx-auto mb-3 text-slate-400" size={24} aria-hidden="true" /><p className="text-sm text-slate-600">No notifications.</p></div> : items.map((item) => {
          const target = recordPaths[item.related_model]
          const content = <div className="flex items-start gap-3 p-4">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.is_read ? 'bg-slate-300' : 'bg-sky-600'}`} aria-label={item.is_read ? 'Read' : 'Unread'} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <h2 className="font-semibold text-slate-800">{item.title}</h2>
                <time className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</time>
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.message}</p>
            </div>
            {!item.is_read && <button onClick={(event) => { event.preventDefault(); event.stopPropagation(); markRead(item) }} className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Mark read</button>}
          </div>
          return target && item.related_id ? <Link key={item.id} to={`/records/${target}`} onClick={() => markRead(item)} className="block hover:bg-slate-50">{content}</Link> : <article key={item.id} className="bg-white">{content}</article>
        })}
        </div>
        {!loading && items.length > 0 && <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>{unreadCount} unread across your inbox</span>
          <div className="flex gap-2"><button disabled={!hasPrevious} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Previous</button><span className="px-2 py-1.5">Page {page}</span><button disabled={!hasNext} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Next</button></div>
        </footer>}
      </section>
    </section>
  )
}

export default NotificationsPage
