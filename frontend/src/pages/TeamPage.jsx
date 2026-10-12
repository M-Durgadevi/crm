import { useEffect, useState } from 'react'
import { UserPlus, Users } from 'lucide-react'
import api from '../api/axiosInstance'

const blank = { first_name: '', last_name: '', email: '', username: '', role: 'employee', password: '' }

function TeamPage({ user }) {
  const [members, setMembers] = useState([])
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/auth/team/')
      setMembers(Array.isArray(data) ? data : data.results || [])
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to load team members.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/auth/team/create/', form)
      setForm(blank)
      setNotice('Team member created.')
      await load()
    } catch (requestError) {
      const data = requestError.response?.data
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to create team member.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="min-h-[calc(100vh-65px)] bg-[#eef4fb] p-5 sm:p-7">
    <header className="mb-5"><p className="text-sm text-slate-500">People and assignments</p><h1 className="text-2xl font-semibold text-slate-800">Sales Team</h1></header>
    {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    {user?.role === 'admin' && <form onSubmit={submit} className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-3">
      <h2 className="inline-flex items-center gap-2 font-semibold sm:col-span-2 xl:col-span-3"><UserPlus size={17} /> Add team member</h2>
      {['first_name', 'last_name', 'email', 'username'].map((key) => <label key={key} className="text-sm font-medium capitalize text-slate-700">{key.replace('_', ' ')}<input required type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>)}
      <label className="text-sm font-medium text-slate-700">Role<select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal">{['employee', 'manager', 'admin'].map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Temporary password<input required minLength={12} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">At least 12 characters. Share it securely and have the user change it.</span></label>
      <div className="sm:col-span-2 xl:col-span-3"><button disabled={saving} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Creating...' : 'Create account'}</button></div>
    </form>}
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Active members</div>
      {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading team...</p> : members.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No members found.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th></tr></thead><tbody className="divide-y divide-slate-100">{members.map((member) => <tr key={member.id}><td className="px-4 py-3 font-medium text-slate-800">{[member.first_name, member.last_name].filter(Boolean).join(' ') || member.username}</td><td className="px-4 py-3 text-slate-600">{member.email}</td><td className="px-4 py-3 capitalize text-slate-600">{member.role}</td></tr>)}</tbody></table></div>}
    </section>
    <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Users size={14} /> Team visibility is limited by your role.</p>
  </section>
}

export default TeamPage
