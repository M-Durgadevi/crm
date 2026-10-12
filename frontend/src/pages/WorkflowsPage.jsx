import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import api from '../api/axiosInstance'

const triggers = ['lead_created', 'lead_qualified', 'task_assigned', 'task_overdue', 'deal_stage_changed']
const actionTypes = ['create_follow_up_task', 'notify_assignee', 'create_activity']
const blankForm = () => ({ name: '', description: '', trigger_event: triggers[0], enabled: true, action_type: actionTypes[0], title: '', message: '', subject: '', description_action: '', due_in_days: 1 })

function WorkflowsPage({ user }) {
  const [workflows, setWorkflows] = useState([])
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState(blankForm)
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [workflowResponse, logResponse] = await Promise.all([
        api.get('/crm/workflows/'),
        api.get('/crm/workflow-logs/'),
      ])
      const workflowData = workflowResponse.data
      const logData = logResponse.data
      setWorkflows(Array.isArray(workflowData) ? workflowData : workflowData.results || [])
      setLogs(Array.isArray(logData) ? logData : logData.results || [])
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Workflow administration requires a manager or administrator account.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(blankForm())
    setFormOpen(true)
    setError('')
    setNotice('')
  }

  const openEdit = (workflow) => {
    const action = workflow.actions?.[0] || { type: actionTypes[0] }
    setEditing(workflow.id)
    setForm({
      name: workflow.name,
      description: workflow.description || '',
      trigger_event: workflow.trigger_event,
      enabled: workflow.enabled,
      action_type: action.type,
      title: action.title || '',
      message: action.message || '',
      subject: action.subject || '',
      description_action: action.description || '',
      due_in_days: action.due_in_days ?? 1,
    })
    setFormOpen(true)
    setError('')
    setNotice('')
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const action = { type: form.action_type }
    if (form.action_type === 'create_follow_up_task') Object.assign(action, { title: form.title, description: form.description_action, due_in_days: Number(form.due_in_days) })
    if (form.action_type === 'notify_assignee') Object.assign(action, { title: form.title, message: form.message })
    if (form.action_type === 'create_activity') Object.assign(action, { subject: form.subject, description: form.description_action })
    const payload = { name: form.name, description: form.description, trigger_event: form.trigger_event, enabled: form.enabled, actions: [action] }
    try {
      if (editing) await api.put(`/crm/workflows/${editing}/`, payload)
      else await api.post('/crm/workflows/', payload)
      setNotice(`Workflow ${editing ? 'updated' : 'created'}.`)
      closeForm()
      await load()
    } catch (requestError) {
      const data = requestError.response?.data
      setError(typeof data === 'object' && data ? Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' ') : 'Unable to save workflow.')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (workflow) => {
    setError('')
    try {
      const { data } = await api.patch(`/crm/workflows/${workflow.id}/`, { enabled: !workflow.enabled })
      setWorkflows((current) => current.map((item) => item.id === data.id ? data : item))
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to change workflow status.')
    }
  }

  const remove = async (workflow) => {
    if (!window.confirm(`Delete workflow “${workflow.name}”? Execution logs will also be removed.`)) return
    setError('')
    try {
      await api.delete(`/crm/workflows/${workflow.id}/`)
      setWorkflows((current) => current.filter((item) => item.id !== workflow.id))
      setNotice('Workflow deleted.')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to delete workflow.')
    }
  }

  if (user?.role === 'employee') return <div className="m-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Workflow configuration is restricted to managers and administrators.</div>

  return (
    <section className="min-h-[calc(100vh-65px)] bg-[#eef4fb] p-5 sm:p-7">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-slate-500">Automation</p><h1 className="text-2xl font-semibold text-slate-800">Workflows</h1></div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"><Plus size={17} /> New workflow</button>
      </header>
      {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      {formOpen && <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editing ? 'Edit workflow' : 'Create workflow'}</h2><button onClick={closeForm} aria-label="Close workflow form" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Name<input required value={form.name} onChange={(event) => update('name', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-medium text-slate-700">Trigger<select value={form.trigger_event} onChange={(event) => update('trigger_event', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal">{triggers.map((trigger) => <option value={trigger} key={trigger}>{trigger.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Action<select value={form.action_type} onChange={(event) => update('action_type', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal">{actionTypes.map((type) => <option value={type} key={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2 xl:col-span-3">Description<textarea rows={2} value={form.description} onChange={(event) => update('description', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          {form.action_type === 'notify_assignee' && <>
            <label className="text-sm font-medium text-slate-700">Notification title<input required value={form.title} onChange={(event) => update('title', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">Message<input required value={form.message} onChange={(event) => update('message', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          </>}
          {form.action_type === 'create_follow_up_task' && <>
            <label className="text-sm font-medium text-slate-700">Task title<input required value={form.title} onChange={(event) => update('title', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">Due in days<input required type="number" min="0" max="365" value={form.due_in_days} onChange={(event) => update('due_in_days', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          </>}
          {form.action_type === 'create_activity' && <label className="text-sm font-medium text-slate-700">Activity subject<input required value={form.subject} onChange={(event) => update('subject', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>}
          {(form.action_type === 'create_activity' || form.action_type === 'create_follow_up_task') && <label className="text-sm font-medium text-slate-700">Action notes<textarea rows={2} value={form.description_action} onChange={(event) => update('description_action', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} className="h-4 w-4 accent-sky-700" /> Enabled</label>
          <div className="flex gap-2 sm:col-span-2 xl:col-span-3"><button disabled={saving} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save workflow'}</button><button type="button" onClick={closeForm} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button></div>
        </form>
      </section>}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Configured workflows</h2>
          {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading workflows...</p> : workflows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No workflows configured.</p> : <ul className="divide-y divide-slate-100">{workflows.map((workflow) => <li key={workflow.id} className="flex items-start gap-3 p-4">
            <button onClick={() => toggle(workflow)} aria-label={`${workflow.enabled ? 'Disable' : 'Enable'} ${workflow.name}`} title={workflow.enabled ? 'Disable' : 'Enable'} className={`mt-0.5 ${workflow.enabled ? 'text-emerald-700' : 'text-slate-400'}`}>{workflow.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}</button>
            <div className="min-w-0 flex-1"><h3 className="font-semibold text-slate-800">{workflow.name}</h3><p className="mt-1 text-sm text-slate-600">{workflow.trigger_event.replaceAll('_', ' ')} · {workflow.actions?.map((action) => action.type.replaceAll('_', ' ')).join(', ')}</p>{workflow.description && <p className="mt-1 text-sm text-slate-500">{workflow.description}</p>}</div>
            <button onClick={() => openEdit(workflow)} aria-label={`Edit ${workflow.name}`} className="rounded-md p-2 text-sky-700 hover:bg-sky-50"><Pencil size={16} /></button><button onClick={() => remove(workflow)} aria-label={`Delete ${workflow.name}`} className="rounded-md p-2 text-rose-700 hover:bg-rose-50"><Trash2 size={16} /></button>
          </li>)}</ul>}
        </section>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Recent execution logs</h2>
          {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading logs...</p> : logs.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No workflow runs recorded.</p> : <ul className="divide-y divide-slate-100">{logs.map((log) => <li key={log.id} className="p-4"><div className="flex justify-between gap-3"><span className="font-medium text-slate-800">{log.workflow}</span><span className={log.status === 'success' ? 'text-xs font-semibold text-emerald-700' : 'text-xs font-semibold text-rose-700'}>{log.status}</span></div><p className="mt-1 text-sm text-slate-600">{log.event_type.replaceAll('_', ' ')} · record {log.payload?.record_id ?? '—'}</p>{log.error_message && <p className="mt-1 text-sm text-rose-700">{log.error_message}</p>}<time className="mt-1 block text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</time></li>)}</ul>}
        </section>
      </div>
    </section>
  )
}

export default WorkflowsPage
