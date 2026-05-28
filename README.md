# ITCareerMatch Backend API

Backend service for ITCareerMatch, a job-matching platform that analyzes CVs, extracts skills, and returns job recommendations based on profile compatibility.

## Tech Stack

- Node.js 18+ with Express
- PostgreSQL via Supabase
- Redis + BullMQ for async processing
- Supabase Auth for JWT authentication
- Supabase Storage for CV and avatar files
- Swagger UI for API documentation
- External AI service for CV and job matching

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL / Supabase project
- Redis server
- Supabase Auth enabled
- AI service URL configured

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env` file and adjust the values for your environment.

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
REDIS_URL=redis://localhost:6379
AI_API_URL=https://your-ai-service.example.com
INTERNAL_API_KEY=your_internal_api_key
SWAGGER_HOST=localhost:3000
SWAGGER_SCHEME=http
FRONTEND_URL=http://localhost:3001
```

### Run locally

Start Redis first, then run the API:

```bash
npm run dev
```

Swagger docs are available at:

```text
http://localhost:3000/api-docs
```

### Run the worker

The worker processes queued CV analysis jobs.

```bash
npm run worker
```

You can also run the worker in production mode:

```bash
npm run worker:start
```

### Production

```bash
npm run start
```

## Available Scripts

- `npm run dev` - Start the API in development mode with nodemon
- `npm run start` - Start the API in production mode
- `npm run worker` - Start the queue worker in development mode with nodemon
- `npm run worker:start` - Start the queue worker in production mode
- `npm run migrate` - Run database migrations

## API Overview

### Public endpoints

- `GET /api/v1/jobs` - List jobs with filters
- `GET /api/v1/jobs/:id` - Get job details
- `POST /api/v1/cv/preview` - Preview CV as guest without saving to database

### Authenticated endpoints

- `GET /api/v1/user/profile` - Get current user profile
- `PUT /api/v1/user/profile` - Update current user profile
- `DELETE /api/v1/user/profile` - Delete current user account
- `POST /api/v1/cv/analyze` - Upload and analyze CV asynchronously
- `GET /api/v1/cv/status/:task_id` - Check analysis task status
- `GET /api/v1/cv/archives` - List uploaded CV archives
- `DELETE /api/v1/cv/archives/:id` - Delete a CV archive and related analysis data
- `GET /api/v1/analysis/history` - List analysis history
- `GET /api/v1/analysis/:id` - Get analysis details
- `GET /api/v1/jobs/recommendations?cv_id=...` - Get top job recommendations for a specific CV

### Internal endpoints

- `POST /internal/ai/match` - Trigger internal AI matching flow
- `POST /api/v1/cv/analyze-single` - Internal single-job CV analysis endpoint

## Authentication

This API uses Supabase Auth JWT tokens.

```bash
Authorization: Bearer <supabase_jwt_token>
```

Most private endpoints require a valid JWT in the `Authorization` header.

## Queue Flow

1. User uploads a CV through `POST /api/v1/cv/analyze`
2. API stores the CV and adds an analysis task to BullMQ
3. Worker processes the task and calls the AI service
4. Analysis results are saved to the database
5. Client polls `GET /api/v1/cv/status/:task_id`

## Data Model

Main tables used by the backend:

- `users` - user profiles
- `jobs` - job listings
- `cv_archives` - uploaded CV files and metadata
- `cv_skills` - extracted CV skills
- `analysis_history` - CV and job match history
- `analysis_details` - skill match and skill gap details
- `skills` - master skill list
- `job_skills` - job-to-skill mapping

## Swagger Notes

- Swagger UI is configured in `src/config/swagger.js`
- Global bearer auth is enabled for protected routes
- Public endpoints override this with `security: []`
- Some update forms intentionally use blank dropdown values so Swagger does not prefill data

## CORS Notes

- Development allows local testing more loosely
- Production uses a whitelist of frontend domains
- Adjust the whitelist in `src/app.js` or use `FRONTEND_URL`

## Error Format

Success response:

```json
{
  "success": true,
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Related Files

- `src/index.js` - application entry point
- `src/app.js` - Express app setup
- `src/config/swagger.js` - Swagger configuration
- `src/lib/queue.js` - BullMQ queue helpers
- `src/worker.js` - worker entry point
- `src/ai.worker.js` - AI job processor

## License

Internal project.
