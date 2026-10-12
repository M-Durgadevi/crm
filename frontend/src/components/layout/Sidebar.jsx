import { NavLink } from 'react-router-dom'
import {
  Activity,
  Building2,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CheckCheck,
  ClipboardList,
  CircleUserRound,
  FileText,
  FolderKanban,
  House,
  LayoutPanelLeft,
  Search,
  MessageSquareText,
  PackageCheck,
  Handshake,
  Settings,
  Users,
} from 'lucide-react'

const links = [
  { label: 'Home', to: '/', icon: House, end: true },
  { label: 'Reports & Analytics', to: '/reports', icon: BarChart3 },
  { label: 'Search', to: '/search', icon: Search },
  { label: 'Leads', to: '/records/leads', icon: FileText },
  { label: 'Contacts', to: '/records/contacts', icon: CircleUserRound },
  { label: 'Accounts', to: '/records/accounts', icon: BriefcaseBusiness },
  { label: 'Account Administration', to: '/account-administration', icon: Building2 },
  { label: 'Deals', to: '/records/deals', icon: FolderKanban },
  { label: 'Tasks', to: '/records/tasks', icon: CheckCheck },
  { label: 'Activities', to: '/records/activities', icon: Activity },
  { label: 'My Requests', to: '/records/requests', icon: ClipboardList },
  { label: 'Sales Enablement', to: '/records/sales-resources', icon: PackageCheck },
  { label: 'Services', to: '/records/services', icon: Handshake },
  { label: 'Projects', to: '/records/projects', icon: FolderKanban },
  { label: 'Voice of the Customer', to: '/records/feedback', icon: MessageSquareText },
  { label: 'Sales Team', to: '/team', icon: Users },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Workflows', to: '/workflows', icon: ClipboardList },
  { label: 'Settings', to: '/settings', icon: Settings },
]

function Sidebar() {
  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-slate-200 bg-[#f4f7fb] px-3 py-5">
      <div className="mb-6 flex items-center gap-3 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-700 text-sm font-bold text-white">C</div>
        <div className="text-lg font-semibold text-slate-800">CRMS</div>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto">
        {links.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-[#e5f0ff] text-[#2f5ca9]' : 'text-slate-600 hover:bg-slate-200/70'}`}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-5 border-t border-slate-200 px-3 pt-4 text-xs text-slate-500">
        <div className="flex items-center gap-2 font-medium text-slate-700"><LayoutPanelLeft size={14} aria-hidden="true" /> CRM workspace</div>
      </div>
    </aside>
  )
}

export default Sidebar