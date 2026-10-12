import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Filter } from 'lucide-react'
import api from '../api/axiosInstance'

const initialReport = { leads_by_status: [], leads_by_source: [], deals_by_stage: [], monthly_sales: [], tasks_by_status: [], overdue_tasks: 0, owner_sales: [] }

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function downloadCsv(report) {
  const sections = [
    ['Leads by status', ['Status', 'Count'], ...report.leads_by_status.map((row) => [row.status, row.value])],
    ['Leads by source', ['Source', 'Count'], ...report.leads_by_source.map((row) => [row.lead_source, row.value])],
    ['Deals by stage', ['Stage', 'Deals', 'Amount'], ...report.deals_by_stage.map((row) => [row.stage, row.count, row.value])],
    ['Monthly sales', ['Month', 'Won deal value', 'Won deals'], ...report.monthly_sales.map((row) => [row.month, row.value, row.deals])],
    ['Tasks by status', ['Status', 'Count'], ...report.tasks_by_status.map((row) => [row.status, row.value])],
    ['Sales by owner', ['Owner', 'Deals', 'Amount'], ...report.owner_sales.map((row) => [row.owner, row.deals, row.value])],
  ]
  const content = sections.map(([title, ...rows]) => [csvCell(title), ...rows.map((row) => row.map(csvCell).join(','))].join('\r\n')).join('\r\n\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'crms-report.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function ChartPanel({ title, data, labelKey, valueKey = 'value', formatter }) {
  const hasData = data.some((item) => Number(item[valueKey]) > 0)
  return <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="mb-4 font-semibold text-slate-800">{title}</h2>
    {hasData ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip formatter={formatter} />
      <Bar dataKey={valueKey} fill="#3786ba" radius={[3, 3, 0, 0]} />
    </BarChart></ResponsiveContainer></div> : <p className="flex h-64 items-center justify-center text-sm text-slate-500">No records in this date range.</p>}
  </section>
}

function ReportsPage({ user }) {
  const [report, setReport] = useState(initialReport)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (from = dateFrom, to = dateTo) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/crm/reports/', { params: { date_from: from || undefined, date_to: to || undefined } })
      setReport(data)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || Object.values(requestError.response?.data || {}).flat().join(' ') || 'Unable to load report data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('', '') }, [])

  const submit = (event) => {
    event.preventDefault()
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError('Start date must not be later than end date.')
      return
    }
    load()
  }

  const dealsByStage = report.deals_by_stage.map((row) => ({ ...row, stage: row.stage.replaceAll('_', ' ') }))
  const tasksByStatus = report.tasks_by_status.map((row) => ({ ...row, status: row.status.replaceAll('_', ' ') }))
  const leadsByStatus = report.leads_by_status.map((row) => ({ ...row, status: row.status.replaceAll('_', ' ') }))

  return (
    <section className="min-h-[calc(100vh-65px)] bg-[#eef4fb] p-5 sm:p-7">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-500">Database reporting</p><h1 className="text-2xl font-semibold text-slate-800">Reports & Analytics</h1></div><button onClick={() => downloadCsv(report)} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download size={16} /> Download CSV</button></header>
      <form onSubmit={submit} className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700">From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
        <label className="text-sm font-medium text-slate-700">To<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
        <button disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"><Filter size={15} /> Apply</button>
        {report.date_from && <span className="text-sm text-slate-500">{report.date_from} to {report.date_to || 'present'}</span>}
      </form>
      {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {loading ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading reports...</div> : <>
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Won deal value</p><p className="mt-2 text-2xl font-semibold text-slate-800">${report.monthly_sales.reduce((sum, row) => sum + Number(row.value || 0), 0).toLocaleString()}</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Closed won deals</p><p className="mt-2 text-2xl font-semibold text-slate-800">{report.monthly_sales.reduce((sum, row) => sum + Number(row.deals || 0), 0)}</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Overdue tasks</p><p className="mt-2 text-2xl font-semibold text-slate-800">{report.overdue_tasks}</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Role scope</p><p className="mt-2 text-lg font-semibold capitalize text-slate-800">{user?.role || 'User'}</p></div>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartPanel title="Leads by status" data={leadsByStatus} labelKey="status" />
          <ChartPanel title="Leads by source" data={report.leads_by_source} labelKey="lead_source" />
          <ChartPanel title="Deals by stage" data={dealsByStage} labelKey="stage" valueKey="count" />
          <ChartPanel title="Won sales by month" data={report.monthly_sales} labelKey="month" formatter={(value) => `$${Number(value).toLocaleString()}`} />
          <ChartPanel title="Tasks by status" data={tasksByStatus} labelKey="status" />
          {user?.role !== 'employee' && <ChartPanel title="Deal value by owner" data={report.owner_sales} labelKey="owner" valueKey="value" formatter={(value) => `$${Number(value).toLocaleString()}`} />}
        </div>
      </>}
    </section>
  )
}

export default ReportsPage
