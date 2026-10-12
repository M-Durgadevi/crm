import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Bell, BriefcaseBusiness, CheckCircle2, CircleDollarSign, FileText, Users } from 'lucide-react'
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip } from 'recharts'
import { getDashboardSummary } from '../api/dashboardApi'

function DashboardPage({ user }) {
  const [summary, setSummary] = useState({
    total_leads: 0,
    total_contacts: 0,
    total_accounts: 0,
    total_deals: 0,
    open_tasks: 0,
    completed_tasks: 0,
    overdue_tasks: 0,
    total_deal_value: 0,
    calls_today: 0,
    lead_status: [],
    deal_stage: [],
    recent_leads: [],
    recent_deals: [],
    upcoming_tasks: [],
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getDashboardSummary()
        setSummary(data)
      } catch {
        setLoadError('Dashboard data could not be loaded. Check your API connection and sign in again if your session expired.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const cards = useMemo(() => [
    { label: 'Open Deals', value: summary.total_deals, to: '/records/deals', icon: FileText, accent: 'bg-sky-100 text-sky-600' },
    { label: 'Open Deal Value', value: `$${Number(summary.total_deal_value || 0).toLocaleString()}`, to: '/records/deals', icon: BriefcaseBusiness, accent: 'bg-indigo-100 text-indigo-600' },
    { label: 'Calls Today', value: summary.calls_today, to: '/records/activities', icon: Bell, accent: 'bg-violet-100 text-violet-600' },
    { label: 'My Leads', value: summary.total_leads, to: '/records/leads', icon: Users, accent: 'bg-emerald-100 text-emerald-600' },
    { label: 'Contacts', value: summary.total_contacts, to: '/records/contacts', icon: Users, accent: 'bg-cyan-100 text-cyan-600' },
    { label: 'Accounts', value: summary.total_accounts, to: '/records/accounts', icon: BriefcaseBusiness, accent: 'bg-amber-100 text-amber-600' },
    { label: 'Open Tasks', value: summary.open_tasks, to: '/records/tasks', icon: CheckCircle2, accent: 'bg-green-100 text-green-600' },
    { label: 'Overdue Tasks', value: summary.overdue_tasks, to: '/records/tasks', icon: Activity, accent: 'bg-rose-100 text-rose-600' },
    { label: 'Completed Tasks', value: summary.completed_tasks, to: '/records/tasks', icon: CircleDollarSign, accent: 'bg-slate-100 text-slate-600' },
  ], [summary])

  const dealChartData = (summary.deal_stage || []).map((item) => ({
    name: item.name,
    value: Number(item.value) || 0,
    fill: item.name === 'Qualification' ? '#9cc9f5' : item.name === 'Needs Analysis' ? '#f0bfd5' : item.name === 'Value Proposition' ? '#a4e2c4' : item.name === 'Proposal' ? '#d3d9ae' : '#f7d584',
  }))

  const tasks = Array.isArray(summary.upcoming_tasks) ? summary.upcoming_tasks : []

  if (loading) {
    return <div className="p-8 text-slate-500">Loading dashboard...</div>
  }
  if (loadError) return <div role="alert" className="m-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError}</div>

  return (
    <div className="min-h-screen bg-[#eef4fb] p-5 text-slate-800">
      <div className="rounded-[22px] border border-slate-200 bg-[#f7f9fc] shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#f7f9fc] px-6 py-4">
          <div className="text-2xl font-semibold text-slate-800">Home</div>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1f2937] text-sm font-semibold text-white">C</div>
              <div className="text-[22px] font-semibold tracking-tight text-slate-800">
                Welcome {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'back'}
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, to, icon: Icon, accent }) => (
              <Link key={label} to={to} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                <div className="mb-3 flex items-center justify-between">
                  <div className={`rounded-xl p-2 ${accent}`}><Icon className="h-5 w-5" /></div>
                </div>
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-2 text-[28px] font-semibold tracking-tight text-slate-800">{value}</div>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 text-xl font-semibold text-slate-800">My Open Tasks</div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Due Date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length > 0 ? tasks.map((task, index) => (
                      <tr key={`${task.title || 'task'}-${index}`} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-slate-700">{task.title || 'Untitled task'}</td>
                        <td className="px-4 py-3 text-slate-600">{task.due_date || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{task.status || 'Pending'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                            task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'normal' ? 'bg-slate-200 text-slate-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {task.priority || 'Normal'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-5 text-center text-sm text-slate-500">No open tasks available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <span>Showing {tasks.length} upcoming tasks</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 text-xl font-semibold text-slate-800">My Pipeline Deals</div>
              <div className="h-[320px] w-full">
                {dealChartData.some((entry) => entry.value > 0) ? <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip />
                    <Funnel dataKey="value" data={dealChartData} isAnimationActive>
                      <LabelList dataKey="name" position="inside" fill="#1f2937" stroke="none" fontSize={12} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">No pipeline deals recorded.</div>}
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {dealChartData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <span>{entry.name}</span>
                    <span className="font-medium text-slate-700">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
