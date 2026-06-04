# ITCareerMatch Backend API

Backend untuk ITCareerMatch, platform yang menerima CV, memproses analisis skill, menyimpan arsip CV, lalu memberi rekomendasi lowongan dan hasil analisis kecocokan.

## Ringkasan

- Backend dibangun dengan Node.js dan Express (ES Modules).
- Data utama disimpan di Supabase PostgreSQL.
- Task analisis dijalankan asinkron lewat BullMQ dan Redis.
- CV guest preview hanya menyimpan sesi sementara di Redis dan mengembalikan success + temp_token.
- Chatbot menggunakan Groq SDK.
- Dokumentasi API tersedia lewat Swagger UI.

## Teknologi Utama

- Node.js 18+ dan Express
- Supabase Auth, PostgreSQL, dan Storage
- Redis & BullMQ
- Swagger UI
- Groq SDK untuk chatbot dan TTS
- pdfjs-dist untuk parsing PDF CV

## Prasyarat

- Node.js 18+
- Redis berjalan
- Proyek Supabase aktif
- `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tersedia
- `AI_API_URL` tersedia untuk layanan AI eksternal
- `GROQ_API_KEY` tersedia untuk chatbot/TTS

## Instalasi

```bash
git clone https://github.com/ITCareerMatch/Backend-ITCareerMatch.git
cd Backend-ITCareerMatch
npm install
```

## Konfigurasi Environment

Buat file `.env` lalu isi sesuai lingkungan Anda:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
REDIS_URL=redis://localhost:6379
AI_API_URL=http://localhost:8000
AI_MATCH_JOB_LIMIT=20
AI_MATCH_CANDIDATE_POOL_LIMIT=200
GROQ_API_KEY=your_groq_api_key
INTERNAL_API_KEY=your_internal_api_key
SWAGGER_HOST=localhost:3000
SWAGGER_SCHEME=http
FRONTEND_URL=http://localhost:3001
```

## Menjalankan Proyek

```bash
# Development
npm run dev       # Terminal 1: API server
npm run worker    # Terminal 2: BullMQ worker

# Production
npm run start
npm run worker:start
```

## Dokumentasi API

Swagger UI tersedia di: http://localhost:3000/api-docs
atau versi live: https://itcareermatch.up.railway.app/api-docs/

## Perintah

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Menjalankan API dengan nodemon |
| `npm run start` | Menjalankan API mode produksi |
| `npm run worker` | Menjalankan worker dengan nodemon |
| `npm run worker:start` | Menjalankan worker mode produksi |
| `npm run migrate` | Menjalankan migrasi database |

## 📁 Struktur Proyek

```
Backend-ITCareerMatch/
├── scripts/                  # Script utilitas & diagnostik
├── src/
│   ├── config/               # Konfigurasi aplikasi
│   ├── constants/            # Konstanta global
│   ├── controllers/          # Handler request per endpoint
│   ├── lib/                  # Helper & konfigurasi library (queue, dll)
│   ├── middlewares/          # Middleware Express (auth, validasi, dll)
│   ├── migrations/           # Migrasi database Supabase
│   ├── repositories/         # Layer akses data (query ke Supabase)
│   ├── routes/               # Definisi routing API
│   ├── services/             # Business logic
│   ├── utils/                # Fungsi utilitas umum
│   ├── ai.worker.js          # Pemroses job AI (BullMQ)
│   ├── app.js                # Konfigurasi Express & route
│   ├── index.js              # Entry point aplikasi
│   └── worker.js             # Entry point worker
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Endpoint Publik

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/jobs` | Daftar lowongan dengan filter |
| GET | `/api/v1/jobs/:id` | Detail lowongan |
| POST | `/api/v1/cv/preview` | Buat sesi preview CV guest di Redis |
| POST | `/api/v1/chatbot/chat` | Chat karier, login opsional |
| POST | `/api/v1/chatbot/tts` | Konversi teks ke audio WAV |
| GET | `/api/v1/chatbot/voices` | Daftar suara TTS yang tersedia |

## Endpoint Terproteksi

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/user/profile` | Ambil profil pengguna |
| PUT | `/api/v1/user/profile` | Perbarui profil pengguna |
| DELETE | `/api/v1/user/profile` | Hapus akun pengguna |
| POST | `/api/v1/cv/analyze` | Upload dan analisis CV penuh |
| POST | `/api/v1/cv/claim` | Klaim sesi preview guest setelah login |
| GET | `/api/v1/cv/status/:task_id` | Cek status analisis |
| GET | `/api/v1/cv/archives` | Daftar arsip CV pengguna |
| DELETE | `/api/v1/cv/archives/:id` | Hapus arsip CV |
| GET | `/api/v1/jobs/recommendations` | Rekomendasi lowongan untuk CV tertentu |
| GET | `/api/v1/analysis/history` | Riwayat analisis |
| GET | `/api/v1/analysis/:id` | Detail analisis |

## Autentikasi

Authorization: Bearer <supabase_jwt_token>

## Alur Utama

**1. Guest Preview**
Upload CV → Parse PDF → Validasi → Simpan sesi Redis (30 menit) → Return temp_token

**2. Analyze / Claim**
Login → POST /cv/claim atau /cv/analyze → Simpan ke Supabase → BullMQ task → Worker panggil AI → Simpan hasil → Frontend polling /cv/status/:task_id

**3. Rekomendasi Lowongan**
GET /cv/archives → Pilih cv_id → GET /jobs/recommendations?cv_id=... → Return rekomendasi teratas

**4. Chatbot**
POST /chatbot/chat → Inject konteks CV (jika ada) → Groq generate balasan → Return respons / WAV (TTS)

## Struktur Data Utama

| Tabel | Deskripsi |
|-------|-----------|
| `users` | Profil pengguna |
| `jobs` | Daftar lowongan |
| `job_skills` | Relasi lowongan ke skill |
| `skills` | Master skill |
| `cv_archives` | Arsip CV dan metadata file |
| `cv_skills` | Skill yang diekstrak dari CV |
| `analysis_history` | Riwayat rekomendasi per CV |
| `analysis_details` | Detail skill match/gap per analisis |

## Format Respons

**Sukses:**
```json
{ "success": true, "data": {} }
```

**Error:**
```json
{ "success": false, "message": "Pesan error" }
```

## Lisensi

Bagian dari Capstone Project — CC26-PSU088. MIT License.
