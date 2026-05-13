# ITCareerMatch - Backend API

Backend service untuk ITCareerMatch - Platform matching pekerjaan berbasis AI untuk IT career.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (Supabase)
- Redis
- Supabase Account

### Installation

1. **Clone repository dan setup dependencies:**

```bash
npm install
```

2. **Setup environment variables:**

```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi Supabase dan Redis Anda:

```env
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
REDIS_HOST=localhost
REDIS_PORT=6379
AI_SERVICE_URL=http://localhost:8000
```

3. **Start Redis (local development):**

```bash
redis-server
```

4. **Run development server:**

```bash
npm run dev
```

Server akan running di `http://localhost:3000`
API Docs: `http://localhost:3000/api-docs`

### Production Setup

**Run in production mode:**

```bash
npm run start
```

**Run queue worker (separate process):**

```bash
npm run worker:start
```

## 📚 Architecture

### Struktur Folder

```
src/
├── config/           # Konfigurasi (DB, Swagger)
├── controllers/      # Request handlers
├── routes/           # API routes
├── services/         # Business logic
├── repositories/     # Database queries
├── middlewares/      # Express middlewares
├── lib/              # Utilities & queue
└── index.js          # Entry point
```

### Core Components

1. **Express API** - REST endpoints untuk CV, Jobs, Analysis
2. **BullMQ + Redis** - Queue system untuk async CV analysis
3. **PostgreSQL** - Database via Supabase
4. **Supabase Auth** - JWT authentication
5. **FastAPI** - External AI service untuk skill extraction & matching

## 🔌 API Endpoints

### CV Management

- `POST /api/v1/cv/upload` - Upload CV (guest, preview only)
- `POST /api/v1/cv/analyze` - Upload & analyze CV (user, async)
- `GET /api/v1/cv/status/:task_id` - Check analysis status

### Jobs

- `GET /api/v1/jobs` - List all jobs dengan filtering
- `GET /api/v1/jobs/:id` - Job details
- `GET /api/v1/jobs/recommendations` - Top-20 personalized job recommendations

### Analysis

- `GET /api/v1/analysis/history` - User's analysis history
- `GET /api/v1/analysis/:id` - Analysis detail dengan skill breakdown

### Internal Endpoints (Backend/Worker Only)

- `POST /internal/ai/extract` - Extract skills dari CV text
- `POST /internal/ai/match` - Match CV dengan filtered jobs

### User

- `GET /api/v1/user/profile` - Current user profile
- `PUT /api/v1/user/profile` - Update user profile

## 🔄 Queue System

### How it works:

1. User upload CV via `POST /api/v1/cv/analyze`
2. Backend save CV dan add task ke queue
3. Worker process CV: extract skills, calculate scores
4. Save results ke database
5. Frontend polling `/api/v1/cv/status/:task_id` untuk hasil

### Start worker:

```bash
npm run worker
```

## 🗄️ Database

Database schema sudah di-setup di Supabase. Struktur utama:

- `users` - User profiles
- `jobs` - Job listings
- `skills` - Master skill list
- `job_skills` - Job-to-skill relationship
- `cv_archives` - Uploaded CVs
- `cv_skills` - Extracted skills dari CV
- `analysis_history` - Match scoring history
- `analysis_details` - Skill detail per analysis

## 🔐 Authentication

Menggunakan Supabase Auth + JWT:

```bash
Authorization: Bearer <supabase_jwt_token>
```

Protected endpoints memerlukan valid JWT di header.

## 🧪 Error Handling

API returns standard response format:

**Success:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**

```json
{
  "success": false,
  "message": "Error description"
}
```

HTTP Status codes:

- `200` - Success
- `400` - Bad request / Validation error
- `401` - Unauthorized
- `404` - Not found
- `500` - Server error

## 📝 Input Validation

Request body profile", validateUserUpdate, userController.updateProfil:

```javascript
// Example di routes
router.get("/", validateJobFilters, jobController.getAll);
router.put("/me", validateUserUpdate, userController.updateMe);
```

Validators di `src/middlewares/validator.middleware.js`

## 🚨 Environment Variables

| Variable            | Description                  | Default               |
| ------------------- | ---------------------------- | --------------------- |
| `NODE_ENV`          | Environment                  | development           |
| `PORT`              | Server port                  | 3000                  |
| `DATABASE_URL`      | PostgreSQL connection string | -                     |
| `SUPABASE_URL`      | Supabase project URL         | -                     |
| `SUPABASE_ANON_KEY` | Supabase anon key            | -                     |
| `REDIS_HOST`        | Redis host                   | localhost             |
| `REDIS_PORT`        | Redis port                   | 6379                  |
| `AI_SERVICE_URL`    | FastAPI service URL          | http://localhost:8000 |

## 🔗 Integration Points

### AI Service Integration

Backend communicate dengan FastAPI service melalui **internal endpoints** yang diproses oleh worker:

**Internal Endpoints (Backend → Worker → AI Service):**

- `POST /internal/ai/extract` - Extract skills dari CV text
- `POST /internal/ai/match` - Match CV dengan filtered jobs

**Purposes:**

- Skill extraction dari CV
- Similarity scoring (SBERT)
- Skill gap analysis

```json
{
  "cv_text": "...",
  "user_id": "...",
  "cv_id": "...",
  "filtered_jobs": [...]
}
```

Response:

```json
{
  "extracted_skills": [...],
  "recommendations": [
    {
      "job_id": "...",
      "job_title": "...",
      "match_score": 85.5,
      "skill_match": [...],
      "skill_gap": [...],
      "ai_insight": "..."
    }
  ]
}
```

## 📦 Dependencies

Main packages:

- `express` - Web framework
- `bullmq` - Job queue
- `redis` - Cache & queue store
- `pg` - PostgreSQL client
- `@supabase/supabase-js` - Supabase client
- `joi` - Input validation
- `multer` - File upload
- `pdf-parse` - PDF parsing
- `axios` - HTTP client
- `swagger-jsdoc` - API documentation

## 🛠️ Development

**Hot reload:**

```bash
npm run dev
```

**Format code:**

```bash
npm run lint
```

**Generate API docs:**

```bash
npm run docs:generate
```

## 🐛 Troubleshooting

### Redis Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

Solusi: Start Redis server terlebih dahulu

### Database Connection Error

```
error: password authentication failed
```

Solusi: Check DATABASE_URL di .env

### Worker Not Processing

Solusi:

1. Ensure Redis is running
2. Check `npm run worker` is running
3. Verify AI_SERVICE_URL is correct

## 📞 Support

For issues atau questions, silakan buka issue di repository atau hubungi tim development.

---

**Last Updated:** May 2026
**Team:** ITCareerMatch Development Team
