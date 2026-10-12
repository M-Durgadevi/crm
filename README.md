# CRMS

CRMS is a React and Django CRM project backed by PostgreSQL. It currently includes JWT authentication, a database-backed Home dashboard, CRUD screens for leads, contacts, accounts, deals, tasks, activities, requests, services, projects, customer feedback and sales resources, notifications, reports/search, workflow administration, and qualified-lead conversion. The implementation checklist and known gaps are tracked in [GAP_ANALYSIS.md](GAP_ANALYSIS.md); this project is still under active development and is not yet a complete production CRM.

## Stack and Structure

- Frontend: React, Vite, JavaScript/JSX, Tailwind CSS utilities, React Router, Axios, Recharts, Lucide React.
- Backend: Python, Django, Django REST Framework, Simple JWT.
- Database: PostgreSQL only. Django does not fall back to SQLite.
- `frontend/src/pages/`: Home, login, reusable records, and notifications screens.
- `backend/apps/users/`: email login, roles, current-user and team endpoints.
- `backend/apps/crm/`: CRM models, serializers, APIs, and migrations.

## PostgreSQL Setup

1. Install PostgreSQL and create a database named `crms_db`, or start the local PostgreSQL service in `docker-compose.yml` with Docker Compose.
2. Copy `backend/.env.example` to `backend/.env` and set the database name, user, password, host, and port to match your PostgreSQL server. Set a unique long `SECRET_KEY`; do not commit `.env`.
3. Apply migrations and create your own administrator account:

   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   ```

4. Start Django:

   ```powershell
   python manage.py runserver 0.0.0.0:8000
   ```

5. In another terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

Open the URL Vite prints (usually `http://localhost:5173`). If using pgAdmin, connect to the same PostgreSQL host, port, database, user, and password; then refresh `crms_db` → Schemas → public → Tables after running migrations.

## Environment Variables

`backend/.env.example` documents `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `CORS_ALLOWED_ORIGINS`. `USE_POSTGRES` is not a database switch; PostgreSQL is always required.

## API Endpoints

- `/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/me/`, `/api/auth/team/`
- `/api/auth/team/create/`, `/api/auth/change-password/`
- `/api/crm/dashboard/`
- `/api/crm/search/`, `/api/crm/reports/`
- `/api/crm/leads/`, `/api/crm/leads/import-csv/`, `/api/crm/leads/{id}/convert/`
- `/api/crm/contacts/`, `/api/crm/accounts/`, `/api/crm/deals/`
- `/api/crm/deals/{id}/stage-history/`
- `/api/crm/tasks/`, `/api/crm/activities/`, `/api/crm/requests/`
- `/api/crm/services/`, `/api/crm/projects/`, `/api/crm/feedback/`, `/api/crm/sales-resources/`
- `/api/crm/notifications/`, `/api/crm/workflows/`, `/api/crm/workflow-logs/`
- `/api/crm/requests/{id}/updates/`, `/api/crm/requests/{id}/add-update/`

CRM list APIs use DRF pagination and support configured search/ordering on the core record modules. JWT access tokens are sent by the shared Axios client.

The Leads screen accepts UTF-8 CSV files up to 2 MB and 500 rows. Required headers: `first_name`, `last_name`, `company`, `email`. Optional headers: `phone`, `lead_source`, `status`, `industry`, `designation`, `notes`, `assigned_to`. The CSV template can be downloaded from the Leads page. Duplicate emails and invalid rows are reported by row number; valid rows in the same file are still imported.

## Development Data and Tests

- `python manage.py populate_demo_data` is an explicit development-only seed command; it creates sample users and records. Do not run it against a production database.
- `python manage.py process_overdue_tasks` runs enabled overdue-task workflows. Schedule it with Windows Task Scheduler or an equivalent job runner for recurring processing.
- Create production accounts with `createsuperuser` and enter real business records through the API/UI.
- Backend configuration check: `python manage.py check`.
- Backend validation tests: `python manage.py test apps.crm.tests`.
- Frontend build: `npm run build`.
- Frontend lint: `npm run lint`.
- Database-backed CRM tests run against Django's isolated PostgreSQL test database when valid local PostgreSQL credentials and permissions are available.

## Troubleshooting

- If browser login says it cannot reach the API, start Django on port `8000` and confirm the configured `CORS_ALLOWED_ORIGINS` includes the Vite origin.
- If Django reports password authentication failed, update `POSTGRES_PASSWORD` in the ignored `backend/.env` to match the PostgreSQL role password.
- If pgAdmin shows no CRMS tables, select the `crms_db` database and run `python manage.py migrate`, then refresh the Tables node.
- For a repeatable local demo dataset only, run `python manage.py populate_demo_data` after migrations.
