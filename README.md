# Task Tracker

A full-stack task management application with real-time updates, role-based access control, and cookie-based JWT authentication.

---

## Table of Contents

- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Database Setup](#database-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Docker Setup (All-in-One)](#docker-setup-all-in-one)
  - [Environment Configuration](#environment-configuration)
- [Design Decisions](#design-decisions)
  - [Architecture Overview](#architecture-overview)
  - [Key Implementation Decisions](#key-implementation-decisions)
- [Assumptions](#assumptions)
- [Future Improvements](#future-improvements)
- [API Documentation](#api-documentation)

---

## Setup Instructions

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | v18+ |
| npm | v9+ |
| PostgreSQL | v14+ |
| Docker & Docker Compose | (optional, for containerised setup) |

---

### Database Setup

**Option A — Docker (recommended, zero-config)**

```bash
# From the project root — spins up a Postgres 15 container
docker compose up postgres -d
```

The container will be available at `localhost:5432` with:

| Field | Value |
|-------|-------|
| User | `taskuser` |
| Password | `taskpassword` |
| Database | `tasktracker` |

**Option B — Local Postgres**

Create the database manually:

```sql
CREATE USER taskuser WITH PASSWORD 'taskpassword';
CREATE DATABASE tasktracker OWNER taskuser;
```

Then update `DATABASE_URL` in `backend/.env` accordingly.

---

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env with your values (see Environment Configuration below)

# 4. Generate the Prisma client
npm run db:generate

# 5. Run database migrations
npm run db:migrate

# 6. (Optional) Seed the database with demo data
npm run db:seed

# 7. Start the development server
npm run dev
```

The API will be available at **http://localhost:3000**.

#### Seed Credentials

After running `npm run db:seed`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@tasktracker.com` | `Admin@123` |
| User | `user@tasktracker.com` | `User@123` |

#### Available Backend Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start production server (requires build) |
| `npm test` | Run Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:seed` | Seed demo users and tasks |
| `npm run db:studio` | Open Prisma Studio (GUI for the DB) |
| `npm run lint` | Lint source files |

---

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Configure the API URL for local development
#    Create/edit frontend/.env:
echo "VITE_API_URL=http://localhost:3000/api" > .env

# 4. Start the development server
npm run dev
```

The frontend will be available at **http://localhost:5173**.

> **Note:** The default `VITE_API_URL` in the repo is `/api` (relative path intended for Nginx in Docker).
> When running the Vite dev server locally, set it to `http://localhost:3000/api` so requests reach the Express server directly.

#### Available Frontend Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint Vue/TS source files |

---

### Docker Setup (All-in-One)

Run the entire stack (Postgres + Backend + Frontend + Nginx) with a single command:

```bash
# From the project root
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend (via Nginx) | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Postgres | localhost:5432 |

> **Important:** Change `JWT_SECRET` in `docker-compose.yml` to a strong random value before any public deployment.

---

### Environment Configuration

#### Backend — `backend/.env`

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://taskuser:taskpassword@localhost:5432/tasktracker?schema=public"

# JWT signing secret — must be at least 32 characters
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"

# Token lifetime (e.g. 7d, 24h, 3600)
JWT_EXPIRES_IN="7d"

# Port the Express server listens on
PORT=3000

# Application environment: development | production | test
NODE_ENV=development
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Prisma-compatible PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs — keep this private |
| `JWT_EXPIRES_IN` | ✅ | JWT expiry duration |
| `PORT` | ✅ | HTTP port for the Express server |
| `NODE_ENV` | ✅ | `development`, `production`, or `test` |
| `FRONTEND_URL` | ❌ | Allowed CORS origin (defaults to `http://localhost:5173`) |

#### Frontend — `frontend/.env`

```env
# Base URL for all API requests (no trailing slash)
VITE_API_URL=http://localhost:3000/api
```

---

## Design Decisions

### Architecture Overview

```
project/
├── backend/               # Node.js + Express + TypeScript REST API
│   ├── prisma/
│   │   ├── schema.prisma  # Database models (User, Task)
│   │   └── seed.ts        # Demo data seeder
│   └── src/
│       ├── config/        # Database, Socket.io, environment config
│       ├── controllers/   # Thin HTTP handlers — delegate to services
│       ├── middleware/     # Auth, CSRF, RBAC, validation, error handler
│       ├── routes/        # Express routers (auth, tasks, admin)
│       ├── schemas/       # Zod validation schemas + DTO types
│       ├── services/      # Business logic layer
│       └── utils/         # Custom error classes, helpers
│
└── frontend/              # Vue 3 + TypeScript SPA
    └── src/
        ├── components/    # Reusable UI components
        ├── views/         # Page-level components (route targets)
        ├── stores/        # Pinia state stores (auth, tasks)
        ├── services/      # Axios API clients
        └── router/        # Vue Router configuration
```

The application follows a classic **layered architecture**:

```
HTTP Request
    │
    ▼
 Middleware          ← Security, auth, validation, CSRF
    │
    ▼
 Controller          ← Parses request, returns HTTP response
    │
    ▼
 Service             ← Business logic, database queries
    │
    ▼
 Prisma ORM          ← Type-safe database access
    │
    ▼
 PostgreSQL
```

---

### Key Implementation Decisions

#### 1. Cookie-Based JWT Authentication (HttpOnly)

JWTs are stored in `HttpOnly` cookies rather than `localStorage`. This prevents JavaScript-based attacks (XSS) from stealing the token. The tradeoff is that CSRF protection is required — addressed by the Double Submit Cookie pattern (see below).

#### 2. CSRF Protection — Double Submit Cookie

On login/register, the server issues two cookies:

- `access_token` — `HttpOnly`, invisible to JavaScript, carries the JWT.
- `csrf_token` — Readable by JavaScript; the frontend reads it and echoes it back as the `X-CSRF-Token` header on every state-mutating request (POST, PUT, DELETE).

The server validates that the header token matches the cookie token. A cross-origin attacker cannot read your cookies, so they cannot forge the header — blocking CSRF.

`GET /api/auth/csrf` allows the frontend to obtain a fresh CSRF token on app load for already-authenticated sessions.

Public endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/csrf`) are exempt from the CSRF check because the user has no session yet.

#### 3. Role-Based Access Control (RBAC)

Two roles exist: `USER` and `ADMIN`.

| Capability | USER | ADMIN |
|------------|------|-------|
| Create own tasks | ✅ | ✅ |
| Read own tasks | ✅ | ✅ |
| Update own tasks | ✅ | ✅ |
| Delete own tasks | ✅ | ✅ |
| Read **all** tasks | ❌ | ✅ |
| Update **any** task | ❌ | ✅ |
| Delete **any** task | ❌ | ✅ |
| Search users | ❌ | ✅ |

The `authenticate` middleware verifies the JWT from the cookie. The `requireRole` middleware enforces the minimum role for admin routes.

#### 4. Input Validation with Zod

All incoming request bodies and query strings are validated with [Zod](https://zod.dev/) schemas before they reach a controller. The `validate` middleware catches Zod errors and returns structured `400` responses. This ensures invalid data never reaches the service layer.

#### 5. Real-Time Updates via Socket.io

When a task is created, updated, or deleted, the backend emits a Socket.io event to:
- The **owner's room** (`room_user_<userId>`) — so the owner's dashboard updates live.
- The **admin room** (`room_admin`) — so admins see all changes in real time.

This removes the need for polling and gives users an instant feedback loop.

#### 6. Pagination & Filtering

All list endpoints (`GET /api/tasks`, `GET /api/admin/tasks`) support:
- `page` / `limit` — offset pagination.
- `status` filter — `TODO`, `IN_PROGRESS`, `DONE`.
- `priority` filter — `LOW`, `MEDIUM`, `HIGH`.
- `search` — case-insensitive substring search over `title` and `description`.
- `userId` (admin only) — filter tasks belonging to a specific user.

#### 7. Rate Limiting

Two tiers of rate limiting are applied via `express-rate-limit`:
- **Auth endpoints** (`/api/auth/*`): 500 requests per 15 minutes.
- **All other API endpoints**: 200 requests per 15 minutes.

#### 8. Security Headers

[Helmet.js](https://helmetjs.github.io/) sets sensible HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) on every response.

#### 9. Database — PostgreSQL + Prisma ORM

PostgreSQL was chosen for its reliability, rich feature set, and excellent support for complex queries. Prisma provides a type-safe query builder, automatic migration management, and a schema-first workflow.

Key schema design choices:
- `cuid()` primary keys — URL-safe, collision-resistant, shorter than UUID v4.
- Cascade delete on `User → Task` — deleting a user removes all their tasks.
- Database-level indexes on `users.email`, `tasks.userId`, and `tasks.status` for query performance.

#### 10. Frontend State Management — Pinia

Pinia is used for global state (auth session, task list). It integrates tightly with Vue 3's Composition API, provides TypeScript inference out-of-the-box, and has a simpler API surface than Vuex.

---

## Assumptions

1. **Single-tenant, user-scoped tasks** — Tasks belong to exactly one user. There is no concept of shared tasks or team workspaces.

2. **Role assignment at registration** — All new accounts receive the `USER` role by default. The `ADMIN` role can only be assigned directly in the database or via the seed script; there is no self-service role-promotion endpoint.

3. **Stateless JWT sessions** — There is no server-side session store or token revocation list. Logging out clears the cookies on the client, but a captured token remains valid until its natural expiry (`JWT_EXPIRES_IN`).

4. **Single allowed CORS origin** — CORS is configured for one origin (`FRONTEND_URL`). Multi-origin or subdomain setups would require extending the CORS configuration.

5. **Postgres is available at startup** — The application does not fall back gracefully if the database is unreachable; it exits with an error. A production deployment would rely on a process manager (PM2, Kubernetes) to restart on failure.

6. **No email verification** — User accounts are active immediately after registration without email confirmation.

7. **Hard deletes only** — Tasks and users are permanently deleted. No soft-delete, recycle bin, or audit trail is implemented.

8. **File attachments are out of scope** — Tasks contain only text fields (title, description, status, priority, due date).

9. **Search is substring-based, not ranked** — The `search` filter uses Postgres `ILIKE` (case-insensitive contains), not weighted full-text search with ranking.

10. **Socket.io uses the in-memory adapter** — In a multi-process or multi-server deployment, this would need to be replaced with the Redis adapter so events propagate across all instances.

---

## Future Improvements

### Security
- **Token revocation / refresh tokens** — Implement refresh token rotation with a server-side deny list (Redis) so that logout is cryptographically effective and long sessions remain secure.
- **Email verification** — Send a confirmation link on registration before activating the account.
- **Two-factor authentication (2FA)** — Add TOTP-based 2FA for an additional authentication factor.
- **Audit logging** — Record who changed what and when to a dedicated audit table.

### Features
- **Task comments / activity feed** — Allow users to comment on tasks with a full activity history.
- **Task assignments** — Allow admins or owners to assign tasks to other users.
- **File attachments** — Support file uploads (e.g. to S3/GCS) as task attachments.
- **Notifications** — Email and/or push notifications for due-date reminders and assignments.
- **Labels / tags** — Free-form tagging for flexible categorisation and filtering.
- **Sub-tasks / checklists** — Hierarchical task breakdown with progress tracking.
- **Due-date reminders** — Scheduled cron job to notify users of approaching deadlines.

### Architecture & Infrastructure
- **Redis adapter for Socket.io** — Replace the default in-memory adapter to support horizontal scaling.
- **Response caching** — Cache frequent read queries (e.g. user profile, task lists) with Redis to reduce database load.
- **Background job queue** — Use BullMQ for email delivery, report generation, and other async workloads.
- **Database read replicas** — Route read-heavy queries to replicas for improved scalability.
- **OpenAPI / Swagger** — Auto-generate interactive API documentation from route definitions.

### Testing
- **Integration test coverage** — End-to-end tests covering the full HTTP → database flow per endpoint.
- **Frontend component tests** — Vitest + Vue Test Utils tests for UI components.
- **Load testing** — Benchmark with k6 or Artillery to establish baseline performance metrics.

### Developer Experience
- **CI/CD pipeline** — Automate linting, testing, building, and deployment on every push.
- **Conventional commits + changelog** — Enforce commit conventions and auto-generate a `CHANGELOG.md`.
- **Startup environment validation** — Fail fast with a clear error if required env vars are missing or malformed (e.g. using `zod` to parse `process.env`).

---

## API Documentation

A **Postman Collection** and **Postman Environment** are provided in the `postman/` directory at the project root:

| File | Description |
|------|-------------|
| `postman/TaskTracker.postman_collection.json` | All API endpoints with example request bodies, pre-request scripts, and test scripts |
| `postman/TaskTracker.postman_environment.json` | Environment variables (`baseUrl`, `csrfToken`) |

### Importing into Postman

1. Open Postman → click **Import** (top-left).
2. Import `postman/TaskTracker.postman_collection.json`.
3. Import `postman/TaskTracker.postman_environment.json`.
4. Select **TaskTracker - Local** from the environment dropdown (top-right).
5. Run **Auth → Login (User)** or **Auth → Register** first — the collection's test scripts automatically capture the CSRF token into an environment variable for all subsequent requests.

### Endpoint Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | Public | Health check |
| `GET` | `/api/auth/csrf` | Public | Get CSRF token (if session exists) |
| `POST` | `/api/auth/register` | Public | Register new user |
| `POST` | `/api/auth/login` | Public | Login |
| `POST` | `/api/auth/logout` | 🔒 User | Logout (clears cookies) |
| `GET` | `/api/auth/me` | 🔒 User | Get current user profile |
| `GET` | `/api/tasks` | 🔒 User | List own tasks (paginated, filterable) |
| `POST` | `/api/tasks` | 🔒 User | Create a task |
| `GET` | `/api/tasks/:id` | 🔒 User | Get task by ID |
| `PUT` | `/api/tasks/:id` | 🔒 User | Update a task |
| `DELETE` | `/api/tasks/:id` | 🔒 User | Delete a task |
| `GET` | `/api/admin/tasks` | 🔒 Admin | List **all** tasks in the system |
| `GET` | `/api/admin/tasks/:id` | 🔒 Admin | Get any task by ID |
| `PUT` | `/api/admin/tasks/:id` | 🔒 Admin | Update any task |
| `DELETE` | `/api/admin/tasks/:id` | 🔒 Admin | Delete any task |
| `GET` | `/api/admin/users/search` | 🔒 Admin | Search users by name or email |

### Query Parameters (Task List Endpoints)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `10` | Items per page (max `100`) |
| `status` | `TODO \| IN_PROGRESS \| DONE` | — | Filter by task status |
| `priority` | `LOW \| MEDIUM \| HIGH` | — | Filter by task priority |
| `search` | `string` | — | Search title and description (case-insensitive) |
| `userId` | `string` | — | **(Admin only)** Filter by owner user ID |

### Standard Response Envelope

**Success (with data):**
```json
{
  "status": "success",
  "message": "Optional human-readable message",
  "data": { "task": { ... } },
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

**Error:**
```json
{
  "status": "fail",
  "message": "Human-readable error description",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `204` | No Content (e.g. DELETE success) |
| `400` | Bad Request — validation failed |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — insufficient role or invalid CSRF token |
| `404` | Not Found |
| `429` | Too Many Requests — rate limit exceeded |
| `500` | Internal Server Error |
