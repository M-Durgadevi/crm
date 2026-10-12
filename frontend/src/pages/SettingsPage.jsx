import { useEffect, useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import api from '../api/axiosInstance'

function SettingsPage({ user, onUserUpdate }) {
  const [profile, setProfile] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '' })
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    api.get('/auth/me/').then(({ data }) => {
      if (active) setProfile({ first_name: data.first_name || '', last_name: data.last_name || '' })
    }).catch(() => {
      if (active) setError('Unable to load your profile. Check the API connection.')
    })
    return () => { active = false }
  }, [])

  const saveProfile = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const { data } = await api.patch('/auth/me/', profile)
      onUserUpdate(data)
      setNotice('Profile updated.')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to update profile.')
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    if (passwords.new_password !== passwords.confirm_password) {
      setError('New password and confirmation do not match.')
      setLoading(false)
      return
    }
    try {
      const { data } = await api.post('/auth/change-password/', { current_password: passwords.current_password, new_password: passwords.new_password })
      localStorage.removeItem('crms_token')
      localStorage.removeItem('crms_refresh')
      setPasswords({ current_password: '', new_password: '', confirm_password: '' })
      setNotice(`${data.detail} Sign in again with your new password.`)
      onUserUpdate(null)
    } catch (requestError) {
      setError(Object.values(requestError.response?.data || {}).flat().join(' ') || 'Unable to change password.')
    } finally {
      setLoading(false)
    }
  }

  return <section className="min-h-[calc(100vh-65px)] bg-[#eef4fb] p-5 sm:p-7">
    <header className="mb-5"><p className="text-sm text-slate-500">Personal account</p><h1 className="text-2xl font-semibold text-slate-800">Settings</h1></header>
    {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={saveProfile} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Profile</h2>
        <label className="mb-4 block text-sm font-medium text-slate-700">Email<input readOnly value={user?.email || ''} className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-500" /></label>
        <label className="mb-4 block text-sm font-medium text-slate-700">First name<input value={profile.first_name} onChange={(event) => setProfile((current) => ({ ...current, first_name: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
        <label className="mb-4 block text-sm font-medium text-slate-700">Last name<input value={profile.last_name} onChange={(event) => setProfile((current) => ({ ...current, last_name: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
        <p className="mb-4 text-sm text-slate-500">Role: <span className="capitalize">{user?.role}</span></p>
        <button disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} /> Save profile</button>
      </form>
      <form onSubmit={changePassword} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 inline-flex items-center gap-2 font-semibold text-slate-800"><KeyRound size={17} /> Change password</h2>
        {['current_password', 'new_password', 'confirm_password'].map((key) => <label key={key} className="mb-4 block text-sm font-medium capitalize text-slate-700">{key.replaceAll('_', ' ')}<input required minLength={key === 'current_password' ? undefined : 12} type="password" value={passwords[key]} onChange={(event) => setPasswords((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>)}
        <p className="mb-4 text-xs text-slate-500">New passwords must be at least 12 characters. Changing your password signs you out.</p>
        <button disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><KeyRound size={16} /> Update password</button>
      </form>
    </div>
  </section>
}

export default SettingsPage
