import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import api from '../api/axiosInstance'

function AccountAdministrationPage({ user }) {
  const [accounts, setAccounts] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [accountResponse, memberResponse] = await Promise.all([api.get('/crm/accounts/'), api.get('/auth/team/')])
      setAccounts(Array.isArray(accountResponse.data) ? accountResponse.data : accountResponse.data.results || [])
      setMembers(Array.isArray(memberResponse.data) ? memberResponse.data : memberResponse.data.results || [])
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to load account ownership data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const assignOwner = async (account, value) => {
    setError('')
    setNotice('')
    try {
      const { data } = await api.patch(`/crm/accounts/${account.id}/`, { assigned_to: value ? Number(value) : null })
      setAccounts((current) => current.map((item) => item.id === account.id ? data : item))
      setNotice(`Ownership updated for ${account.name}.`)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to update account ownership.')
    }
  }

  if (!['manager', 'admin'].includes(user?.role)) return <div className="m-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Account administration is restricted to managers and administrators.</div>

  return <section className="min-h-[calc(100vh-65px)] bg-[#eef4fb] p-5 sm:p-7">
    <header className="mb-5"><p className="text-sm text-slate-500">Ownership and access</p><h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800"><ShieldCheck size={23} /> Account Administration</h1></header>
    {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Account ownership</div>
      {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading accounts...</p> : accounts.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No accounts have been created.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Industry</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Owner</th></tr></thead><tbody className="divide-y divide-slate-100">{accounts.map((account) => <tr key={account.id}><td className="px-4 py-3 font-medium text-slate-800">{account.name}</td><td className="px-4 py-3 text-slate-600">{account.industry || '—'}</td><td className="px-4 py-3 text-slate-600">{account.email || '—'}</td><td className="px-4 py-3"><select value={account.assigned_to || ''} onChange={(event) => assignOwner(account, event.target.value)} aria-label={`Assign owner for ${account.name}`} className="min-w-48 rounded-md border border-slate-300 bg-white px-3 py-2"><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{[member.first_name, member.last_name].filter(Boolean).join(' ') || member.email} · {member.role}</option>)}</select></td></tr>)}</tbody></table></div>}
    </section>
  </section>
}

export default AccountAdministrationPage
