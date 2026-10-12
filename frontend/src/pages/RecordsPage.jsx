import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import api from '../api/axiosInstance'

const modules = {
  leads: {
    title: 'Leads', endpoint: 'leads', search: 'Search name, company, email or status', ordering: ['-created_at', 'first_name', 'company', 'status'],
    columns: [['name', 'Name'], ['company', 'Company'], ['email', 'Email'], ['status', 'Status'], ['lead_source', 'Source']],
    fields: [
      ['first_name', 'First name', 'text', true], ['last_name', 'Last name', 'text', true], ['company', 'Company', 'text', true],
      ['email', 'Email', 'email', true], ['phone', 'Phone', 'tel'], ['lead_source', 'Source', 'select', false, ['website', 'referral', 'social', 'email', 'other']],
      ['status', 'Status', 'select', false, ['new', 'contacted', 'qualified', 'unqualified', 'converted']], ['industry', 'Industry', 'text'], ['designation', 'Job title', 'text'], ['assigned_to', 'Owner', 'relation', false, 'team'], ['notes', 'Notes', 'textarea'],
    ],
  },
  contacts: {
    title: 'Contacts', endpoint: 'contacts', search: 'Search name, email, phone or job title', ordering: ['-created_at', 'first_name', 'last_name', 'email'],
    columns: [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['job_title', 'Job title'], ['account', 'Account ID']],
    fields: [['first_name', 'First name', 'text', true], ['last_name', 'Last name', 'text', true], ['email', 'Email', 'email', true], ['phone', 'Phone', 'tel'], ['job_title', 'Job title', 'text'], ['account', 'Account', 'relation', false, 'accounts'], ['assigned_to', 'Owner', 'relation', false, 'team'], ['notes', 'Notes', 'textarea']],
  },
  accounts: {
    title: 'Accounts', endpoint: 'accounts', search: 'Search company, industry, email or phone', ordering: ['-created_at', 'name', 'industry'],
    columns: [['name', 'Account'], ['industry', 'Industry'], ['email', 'Email'], ['phone', 'Phone'], ['website', 'Website']],
    fields: [['name', 'Account name', 'text', true], ['website', 'Website', 'url'], ['industry', 'Industry', 'text'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email'], ['billing_address', 'Billing address', 'textarea'], ['description', 'Notes', 'textarea'], ['services', 'Services', 'multi-relation', false, 'services'], ['assigned_to', 'Owner', 'relation', false, 'team']],
  },
  deals: {
    title: 'Deals', endpoint: 'deals', search: 'Search deal, stage or description', ordering: ['-created_at', 'name', 'amount', 'stage', 'expected_closing_date'],
    columns: [['name', 'Deal'], ['amount', 'Amount'], ['stage', 'Stage'], ['probability', 'Probability'], ['expected_closing_date', 'Close date']],
    fields: [['name', 'Deal name', 'text', true], ['account', 'Account', 'relation', false, 'accounts'], ['contact', 'Contact', 'relation', false, 'contacts'], ['amount', 'Amount', 'number', true], ['stage', 'Stage', 'select', false, ['qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost']], ['probability', 'Probability (%)', 'number'], ['expected_closing_date', 'Expected close date', 'date'], ['services', 'Services', 'multi-relation', false, 'services'], ['assigned_to', 'Owner', 'relation', false, 'team'], ['description', 'Description', 'textarea']],
  },
  tasks: {
    title: 'Tasks', endpoint: 'tasks', search: 'Search task, status or priority', ordering: ['-created_at', 'title', 'due_date', 'status', 'priority'],
    columns: [['title', 'Task'], ['due_date', 'Due date'], ['status', 'Status'], ['priority', 'Priority'], ['related_model', 'Related to']],
    fields: [['title', 'Subject', 'text', true], ['description', 'Description', 'textarea'], ['assigned_to', 'Assignee', 'relation', false, 'team'], ['related_model', 'Related record type', 'select', false, ['', 'lead', 'contact', 'account', 'deal', 'project']], ['related_id', 'Related record', 'record-relation'], ['priority', 'Priority', 'select', false, ['low', 'medium', 'high']], ['status', 'Status', 'select', false, ['pending', 'in_progress', 'completed']], ['due_date', 'Due date', 'date']],
  },
  activities: {
    title: 'Activities', endpoint: 'activities', search: 'Search subject, notes or type', ordering: ['-created_at', 'subject', 'scheduled_at', 'activity_type'],
    columns: [['subject', 'Subject'], ['activity_type', 'Type'], ['scheduled_at', 'Scheduled'], ['completed', 'Completed'], ['related_model', 'Related to']],
    fields: [['subject', 'Subject', 'text', true], ['activity_type', 'Type', 'select', false, ['call', 'meeting', 'email', 'follow_up', 'note']], ['description', 'Notes', 'textarea'], ['related_model', 'Related record type', 'select', false, ['', 'lead', 'contact', 'account', 'deal', 'project']], ['related_id', 'Related record', 'record-relation'], ['assigned_to', 'Owner', 'relation', false, 'team'], ['scheduled_at', 'Scheduled at', 'datetime-local'], ['completed', 'Completed', 'checkbox']],
  },
  requests: {
    title: 'Requests', endpoint: 'requests', search: 'Search request title, status or priority', ordering: ['-created_at', 'title', 'status', 'priority'],
    columns: [['title', 'Request'], ['status', 'Status'], ['priority', 'Priority'], ['account', 'Account'], ['assigned_to', 'Assignee']],
    fields: [['title', 'Title', 'text', true], ['description', 'Description', 'textarea', true], ['status', 'Status', 'select', false, ['new', 'in_progress', 'waiting', 'completed', 'rejected']], ['priority', 'Priority', 'select', false, ['low', 'medium', 'high']], ['assigned_to', 'Assignee', 'relation', false, 'team'], ['account', 'Account', 'relation', false, 'accounts'], ['deal', 'Deal', 'relation', false, 'deals']],
  },
  services: {
    title: 'Services', endpoint: 'services', search: 'Search service name, code or description', ordering: ['name', 'base_price', '-created_at'],
    columns: [['name', 'Service'], ['code', 'Code'], ['base_price', 'Base price'], ['is_active', 'Active']],
    fields: [['name', 'Name', 'text', true], ['code', 'Code', 'text', true], ['description', 'Description', 'textarea'], ['base_price', 'Base price', 'number'], ['is_active', 'Active', 'checkbox']],
  },
  projects: {
    title: 'Projects', endpoint: 'projects', search: 'Search project, status or account', ordering: ['-created_at', 'name', 'status', 'due_date', 'progress'],
    columns: [['name', 'Project'], ['status', 'Status'], ['priority', 'Priority'], ['progress', 'Progress'], ['due_date', 'Due date'], ['account', 'Account']],
    fields: [['name', 'Name', 'text', true], ['description', 'Description', 'textarea'], ['owner', 'Owner', 'relation', false, 'team'], ['members', 'Team members', 'multi-relation', false, 'team'], ['status', 'Status', 'select', false, ['planning', 'active', 'on_hold', 'completed', 'cancelled']], ['priority', 'Priority', 'select', false, ['low', 'medium', 'high']], ['progress', 'Progress (%)', 'number'], ['start_date', 'Start date', 'date'], ['due_date', 'Due date', 'date'], ['account', 'Account', 'relation', false, 'accounts'], ['deal', 'Deal', 'relation', false, 'deals']],
  },
  feedback: {
    title: 'Customer Feedback', endpoint: 'feedback', search: 'Search comments, category or status', ordering: ['-received_at', 'rating', 'status'],
    columns: [['category', 'Category'], ['rating', 'Rating'], ['source', 'Source'], ['status', 'Status'], ['account', 'Account'], ['received_at', 'Received']],
    fields: [['source', 'Source', 'select', false, ['survey', 'email', 'call', 'social', 'other']], ['account', 'Account', 'relation', false, 'accounts'], ['contact', 'Contact', 'relation', false, 'contacts'], ['rating', 'Rating (1-5)', 'number', true], ['category', 'Category', 'text', true], ['comments', 'Comments', 'textarea', true], ['received_at', 'Received at', 'datetime-local'], ['status', 'Status', 'select', false, ['new', 'reviewing', 'actioned', 'closed']], ['assigned_to', 'Owner', 'relation', false, 'team']],
  },
  'sales-resources': {
    title: 'Sales Enablement', endpoint: 'sales-resources', search: 'Search approved playbooks, templates or documents', ordering: ['-created_at', 'title', 'resource_type'],
    columns: [['title', 'Resource'], ['resource_type', 'Type'], ['approved', 'Approved'], ['active', 'Active'], ['url', 'Link']],
    fields: [['title', 'Title', 'text', true], ['resource_type', 'Type', 'select', false, ['playbook', 'template', 'presentation', 'document']], ['description', 'Description', 'textarea'], ['url', 'HTTPS resource URL', 'url', true], ['approved', 'Approved', 'checkbox'], ['active', 'Active', 'checkbox']],
  },
}
const singularNames = { leads: 'Lead', contacts: 'Contact', accounts: 'Account', deals: 'Deal', tasks: 'Task', activities: 'Activity', requests: 'Request', services: 'Service', projects: 'Project', feedback: 'Feedback', 'sales-resources': 'Resource' }

const emptyRecord = (config) => Object.fromEntries(config.fields.map(([key, , type]) => [key, type === 'checkbox' ? ['is_active', 'active'].includes(key) : type === 'multi-relation' ? [] : key === 'probability' || key === 'progress' ? 0 : '']))

function displayValue(key, value, record) {
  if (key === 'name' && record.first_name !== undefined) return `${record.first_name} ${record.last_name}`.trim()
  if (key === 'completed') return value ? 'Yes' : 'No'
  if (value === null || value === undefined || value === '') return '—'
  return String(value).replaceAll('_', ' ')
}

function RecordsPage({ user }) {
  const { module } = useParams()
  const [searchParams] = useSearchParams()
  const config = modules[module]
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [next, setNext] = useState(false)
  const [previous, setPrevious] = useState(false)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState(() => searchParams.get('search') || '')
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '')
  const [ordering, setOrdering] = useState('-created_at')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(() => emptyRecord(config || modules.leads))
  const [relationOptions, setRelationOptions] = useState({})
  const [requestHistory, setRequestHistory] = useState(null)
  const [requestUpdate, setRequestUpdate] = useState('')
  const [dealHistory, setDealHistory] = useState(null)

  const fields = useMemo(() => config?.fields || [], [config])
  const canAdminister = ['manager', 'admin'].includes(user?.role)
  const readOnlyModule = ['services', 'sales-resources'].includes(module) && !canAdminister
  const canManageProject = (record) => canAdminister || module !== 'projects' || record.owner === user?.id

  useEffect(() => {
    if (!config) return
    let active = true
    setLoading(true)
    setError('')
    api.get(`/crm/${config.endpoint}/`, { params: { page, search: query, ordering } })
      .then(({ data }) => {
        if (!active) return
        setRows(Array.isArray(data) ? data : data.results || [])
        setCount(Array.isArray(data) ? data.length : data.count || 0)
        setNext(Boolean(data.next))
        setPrevious(Boolean(data.previous))
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.detail || 'Could not load records. Check your API connection and permissions.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [config, page, query, ordering])

  useEffect(() => {
    if (!config) return
    const resources = new Set(fields.filter(([, , type]) => ['relation', 'multi-relation'].includes(type)).map(([, , , , resource]) => resource))
    if (fields.some(([, , type]) => type === 'record-relation')) {
      ;['leads', 'contacts', 'accounts', 'deals', 'projects'].forEach((resource) => resources.add(resource))
    }
    let active = true
    Promise.all([...resources].map((resource) => {
      const path = resource === 'team' ? '/auth/team/' : `/crm/${resource}/`
      return api.get(path).then(({ data }) => [resource, Array.isArray(data) ? data : data.results || []])
    })).then((entries) => {
      if (active) setRelationOptions(Object.fromEntries(entries))
    }).catch(() => {
      if (active) setRelationOptions({})
    })
    return () => { active = false }
  }, [config, fields])

  const startCreate = () => {
    setEditing(null)
    setFormOpen(true)
    setForm(emptyRecord(config))
    setError('')
    setNotice('')
  }

  const startEdit = (record) => {
    setEditing(record.id)
    setFormOpen(true)
    setForm(Object.fromEntries(fields.map(([key, , type]) => [key, type === 'multi-relation' ? (record[key] || []).map(String) : record[key] ?? ''])))
    setError('')
    setNotice('')
  }

  const closeForm = () => {
    setEditing(null)
    setFormOpen(false)
    setForm(emptyRecord(config))
  }

  const submitSearch = (event) => {
    event.preventDefault()
    setPage(1)
    setQuery(searchInput.trim())
  }

  const submitRecord = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const payload = { ...form }
    for (const [key, , type] of fields) {
      if (type === 'multi-relation') payload[key] = (payload[key] || []).map(Number)
      if ((type === 'number' || ['account', 'contact', 'assigned_to', 'related_id'].includes(key)) && payload[key] !== '') {
        payload[key] = Number(payload[key])
      }
      if (payload[key] === '' && ['account', 'contact', 'assigned_to', 'due_date', 'expected_closing_date', 'scheduled_at'].includes(key)) payload[key] = null
      if (payload[key] === '' && key === 'related_id') payload[key] = 0
    }
    try {
      if (editing) await api.put(`/crm/${config.endpoint}/${editing}/`, payload)
      else await api.post(`/crm/${config.endpoint}/`, payload)
      closeForm()
      setNotice(`${config.title.slice(0, -1)} ${editing ? 'updated' : 'created'}.`)
      const { data } = await api.get(`/crm/${config.endpoint}/`, { params: { page, search: query, ordering } })
      setRows(Array.isArray(data) ? data : data.results || [])
      setCount(Array.isArray(data) ? data.length : data.count || 0)
    } catch (requestError) {
      const responseErrors = requestError.response?.data
      setError(typeof responseErrors === 'object' ? Object.entries(responseErrors).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' ') : 'Unable to save this record.')
    } finally {
      setSaving(false)
    }
  }

  const convertLead = async (record) => {
    if (!window.confirm(`Convert ${record.first_name} ${record.last_name} into a linked account and contact?`)) return
    setError('')
    setNotice('')
    try {
      const { data } = await api.post(`/crm/leads/${record.id}/convert/`, { create_deal: false })
      setRows((current) => current.map((item) => item.id === data.id ? data : item))
      setNotice('Lead converted and linked account/contact records created.')
    } catch (requestError) {
      const detail = requestError.response?.data?.detail
      setError(detail || 'Lead conversion failed. Check its status and linked records.')
    }
  }

  const loadRequestHistory = async (record) => {
    setError('')
    setRequestHistory({ record, entries: [] })
    try {
      const { data } = await api.get(`/crm/requests/${record.id}/updates/`)
      setRequestHistory({ record, entries: data })
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to load request history.')
      setRequestHistory(null)
    }
  }

  const addRequestUpdate = async (event) => {
    event.preventDefault()
    if (!requestHistory || !requestUpdate.trim()) return
    setError('')
    try {
      const { data } = await api.post(`/crm/requests/${requestHistory.record.id}/add-update/`, { body: requestUpdate.trim() })
      setRequestHistory((current) => ({ ...current, entries: [...current.entries, data] }))
      setRequestUpdate('')
      setNotice('Request update added.')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to add request update.')
    }
  }

  const loadDealHistory = async (record) => {
    setError('')
    setDealHistory({ record, entries: [] })
    try {
      const { data } = await api.get(`/crm/deals/${record.id}/stage-history/`)
      setDealHistory({ record, entries: data })
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to load deal stage history.')
      setDealHistory(null)
    }
  }

  const deleteRecord = async (record) => {
    if (!window.confirm(`Delete this ${singularNames[module].toLowerCase()}? This cannot be undone.`)) return
    setError('')
    setNotice('')
    try {
      await api.delete(`/crm/${config.endpoint}/${record.id}/`)
      setRows((current) => current.filter((item) => item.id !== record.id))
      setCount((current) => Math.max(0, current - 1))
      setNotice('Record deleted.')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to delete this record.')
    }
  }

  if (!config) return <div className="p-8 text-sm text-slate-600">This module is not available.</div>

  return (
    <section className="min-h-[calc(100vh-65px)] bg-[#eef4fb] p-5 text-slate-800 sm:p-7">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">CRM workspace</p>
          <h1 className="text-2xl font-semibold">{config.title}</h1>
        </div>
        {!readOnlyModule && <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800">
          <Plus size={17} aria-hidden="true" /> Add {singularNames[module]}
        </button>}
      </header>

      {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      {formOpen && !readOnlyModule ? (
        <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-label={`${editing ? 'Edit' : 'Create'} ${config.title}`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editing ? `Edit ${singularNames[module]}` : `New ${singularNames[module]}`}</h2>
            <button onClick={closeForm} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close form"><X size={18} /></button>
          </div>
          <form onSubmit={submitRecord} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map(([key, label, type, required, options]) => (
              <label key={key} className={`block text-sm font-medium text-slate-700 ${type === 'textarea' ? 'sm:col-span-2 xl:col-span-3' : ''}`}>
                {label}{required ? ' *' : ''}
                {type === 'textarea' ? (
                  <textarea required={required} value={form[key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} rows={3} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" />
                ) : type === 'select' ? (
                  <select required={required} value={form[key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100">
                    {!required && <option value="">Select...</option>}{options.map((option) => <option key={option} value={option}>{option ? option.replaceAll('_', ' ') : 'None'}</option>)}
                  </select>
                ) : type === 'relation' || type === 'record-relation' || type === 'multi-relation' ? (
                  (() => {
                    const resource = type === 'relation' || type === 'multi-relation' ? options : form.related_model ? `${form.related_model}s` : null
                    const optionsForField = resource ? relationOptions[resource] || [] : []
                    return <select required={required} multiple={type === 'multi-relation'} value={type === 'multi-relation' ? form[key] || [] : form[key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [key]: type === 'multi-relation' ? [...event.target.selectedOptions].map((option) => option.value) : event.target.value }))} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100">
                      {type !== 'multi-relation' && <option value="">{type === 'record-relation' && !resource ? 'Choose a record type first' : 'None'}</option>}
                      {optionsForField.map((option) => {
                        const label = option.name || [option.first_name, option.last_name].filter(Boolean).join(' ') || option.email || `Record ${option.id}`
                        return <option key={option.id} value={option.id}>{label}</option>
                      })}
                    </select>
                  })()
                ) : type === 'checkbox' ? (
                  <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))} className="ml-3 h-4 w-4 accent-sky-700" />
                ) : (
                  <input type={type} required={required} value={form[key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} min={key === 'probability' ? 0 : undefined} max={key === 'probability' ? 100 : undefined} step={key === 'amount' ? '0.01' : undefined} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" />
                )}
              </label>
            ))}
            <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-3">
              <button disabled={saving} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save changes' : `Create ${singularNames[module].toLowerCase()}`}</button>
              <button type="button" onClick={closeForm} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </section>
      ) : null}

      {requestHistory && <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-slate-800">Update history: {requestHistory.record.title}</h2><button onClick={() => setRequestHistory(null)} className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Close</button></div>
        {requestHistory.entries.length ? <ol className="mb-4 divide-y divide-slate-100">{requestHistory.entries.map((entry) => <li key={entry.id} className="py-3"><p className="text-sm text-slate-700">{entry.body}</p><time className="mt-1 block text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</time></li>)}</ol> : <p className="mb-4 text-sm text-slate-500">No updates have been added to this request.</p>}
        <form onSubmit={addRequestUpdate} className="flex flex-wrap gap-2"><input required value={requestUpdate} onChange={(event) => setRequestUpdate(event.target.value)} placeholder="Add a status update or comment" className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" /><button className="rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white">Add update</button></form>
      </section>}
      {dealHistory && <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-slate-800">Stage history: {dealHistory.record.name}</h2><button onClick={() => setDealHistory(null)} className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Close</button></div>
        {dealHistory.entries.length ? <ol className="divide-y divide-slate-100">{dealHistory.entries.map((entry) => <li key={entry.id} className="py-3 text-sm"><span className="font-medium capitalize text-slate-800">{entry.previous_stage ? entry.previous_stage.replaceAll('_', ' ') : 'Created'} → {entry.new_stage.replaceAll('_', ' ')}</span><time className="mt-1 block text-xs text-slate-500">{new Date(entry.changed_at).toLocaleString()}</time></li>)}</ol> : <p className="text-sm text-slate-500">No stage changes recorded.</p>}
      </section>}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-slate-300 px-3">
            <Search size={16} className="text-slate-400" aria-hidden="true" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={config.search} aria-label={`Search ${config.title.toLowerCase()}`} className="w-full py-2 text-sm outline-none" />
          </div>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Search</button>
          <label className="flex items-center gap-2 text-sm text-slate-600">Sort
            <select value={ordering} onChange={(event) => { setOrdering(event.target.value); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-2">
              {config.ordering.map((item) => <option key={item} value={item}>{item.startsWith('-') ? `${item.slice(1)} descending` : `${item} ascending`}</option>)}
            </select>
          </label>
        </form>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr>{config.columns.map(([, label]) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}<th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={config.columns.length + 1} className="px-4 py-10 text-center text-slate-500">Loading records...</td></tr> : rows.length === 0 ? <tr><td colSpan={config.columns.length + 1} className="px-4 py-10 text-center text-slate-500">No {config.title.toLowerCase()} found.</td></tr> : rows.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  {config.columns.map(([key]) => <td key={key} className="max-w-[320px] truncate px-4 py-3 text-slate-700">{displayValue(key, record[key], record)}</td>)}
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {module === 'leads' && record.status === 'qualified' && !record.converted_contact && <button onClick={() => convertLead(record)} className="rounded-md px-2 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Convert</button>}
                    {module === 'requests' && <button onClick={() => loadRequestHistory(record)} className="rounded-md px-2 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">Updates</button>}
                    {module === 'deals' && <button onClick={() => loadDealHistory(record)} className="rounded-md px-2 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">History</button>}
                    {!readOnlyModule && canManageProject(record) && <button onClick={() => startEdit(record)} className="rounded-md p-2 text-sky-700 hover:bg-sky-50" aria-label={`Edit ${singularNames[module]}`} title="Edit"><Pencil size={16} /></button>}
                    {!readOnlyModule && canManageProject(record) && <button onClick={() => deleteRecord(record)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50" aria-label={`Delete ${singularNames[module]}`} title="Delete"><Trash2 size={16} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>{count} records</span>
          <div className="flex items-center gap-2">
            <button disabled={!previous || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Previous</button>
            <span>Page {page}</span>
            <button disabled={!next || loading} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </footer>
      </section>
    </section>
  )
}

export default RecordsPage
