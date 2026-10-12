import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import api from '../api/axiosInstance'

const modulePaths = { lead: 'leads', contact: 'contacts', account: 'accounts', deal: 'deals', task: 'tasks', activity: 'activities', request: 'requests', project: 'projects', feedback: 'feedback', service: 'services', sales_resource: 'sales-resources' }

function SearchPage() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async (event) => {
    event.preventDefault()
    const query = input.trim()
    if (query.length < 2) {
      setError('Enter at least two characters to search.')
      return
    }
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const { data } = await api.get('/crm/search/', { params: { q: query } })
      setResults(data.results || [])
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Search could not be completed.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-65px)] bg-[#eef4fb] p-5 sm:p-7">
      <header className="mb-5"><p className="text-sm text-slate-500">Search CRM records</p><h1 className="text-2xl font-semibold text-slate-800">Global Search</h1></header>
      <form onSubmit={search} className="mb-5 flex gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <label className="flex min-w-0 flex-1 items-center gap-3 px-2"><Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" /><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search CRM records" aria-label="Search CRM" className="w-full py-2 text-sm outline-none" /></label>
        <button disabled={loading} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">{loading ? 'Searching...' : 'Search'}</button>
      </form>
      {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      <section className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-live="polite">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Searching records...</p> : !searched ? <p className="p-8 text-center text-sm text-slate-500">Search across records you are permitted to access.</p> : results.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No matching records.</p> : results.map((result) => <Link key={`${result.type}-${result.id}`} to={`/records/${modulePaths[result.type]}?search=${encodeURIComponent(input.trim())}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
          <div className="min-w-0"><h2 className="truncate font-semibold text-slate-800">{result.title}</h2><p className="mt-1 truncate text-sm text-slate-600">{result.subtitle}</p></div>
          <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">{result.type}</span>
        </Link>)}
      </section>
    </section>
  )
}

export default SearchPage
