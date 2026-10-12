import { useState } from 'react'
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import api from '../api/axiosInstance'

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/auth/login/', { email, password })

      localStorage.setItem('crms_token', data.access)
      localStorage.setItem('crms_refresh', data.refresh)
      localStorage.setItem('crms_user', JSON.stringify(data.user))
      onLogin(data.user)
    } catch (err) {
      setError(!err.response
        ? 'Cannot reach the CRM API. Start the backend at http://localhost:8000 and verify its PostgreSQL connection.'
        : err.response.data?.detail || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[1.35fr_1fr]">
        <div className="hidden bg-gradient-to-br from-sky-900 via-indigo-900 to-blue-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg font-bold">C</div>
              <span className="text-xl font-semibold">CRMS</span>
            </div>
            <h1 className="max-w-sm text-4xl font-semibold leading-tight">Customer growth starts with clarity.</h1>
          </div>

          <div className="space-y-4 text-sky-100">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <ShieldCheck className="h-5 w-5 text-sky-300" />
              <span>Secure lead lifecycle management</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <LockKeyhole className="h-5 w-5 text-sky-300" />
              <span>Role-aware workflow controls</span>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-12">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-700">CRMS</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Welcome back</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-500 focus-within:bg-white">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-0 bg-transparent py-3 text-sm text-slate-800 outline-none"
                  placeholder="email@company.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}

export default LoginPage
