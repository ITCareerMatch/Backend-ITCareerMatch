# ITCareerMatch Backend API

Backend untuk ITCareerMatch, platform yang menerima CV, memproses analisis skill, menyimpan arsip CV, lalu memberi rekomendasi lowongan dan hasil analisis kecocokan.

## Ringkasan

- Backend dibangun dengan Node.js dan Express (ES Modules).
- Data utama disimpan di Supabase PostgreSQL.
- Task analisis dijalankan asinkron lewat BullMQ dan Redis.
- CV guest preview hanya menyimpan sesi sementara di Redis dan mengembalikan `success` + `temp_token`.
- Chatbot menggunakan Groq SDK.
- Dokumentasi API tersedia lewat Swagger UI.

## Teknologi Utama

- Node.js 18+ dan Express
- Supabase Auth, PostgreSQL, dan Storage
- Redis
- BullMQ
- Swagger UI
- Groq SDK untuk chatbot dan TTS
- pdfjs-dist untuk parsing PDF CV

## Prasyarat

- Node.js 18+.
- Redis berjalan.
- Proyek Supabase aktif.
- `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tersedia.
- `AI_API_URL` tersedia untuk layanan AI eksternal.
- `GROQ_API_KEY` tersedia untuk chatbot/TTS.

## Instalasi

```bash
npm install
```

## Konfigurasi Environment

Buat file `.env` lalu isi sesuai lingkungan Anda.

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
REDIS_URL=redis://localhost:6379
AI_API_URL=http://localhost:8000
GROQ_API_KEY=your_groq_api_key
INTERNAL_API_KEY=your_internal_api_key
SWAGGER_HOST=localhost:3000
SWAGGER_SCHEME=http
FRONTEND_URL=http://localhost:3001
```

## Menjalankan Proyek

Jalankan API development:

```bash
npm run dev
```

Jalankan worker:

```bash
npm run worker
```

Untuk mode produksi:

```bash
npm run start
npm run worker:start
```

## Dokumentasi API

Swagger UI tersedia di:

```text
http://localhost:3000/api-docs
```

## Perintah

- `npm run dev` - menjalankan API dengan nodemon
- `npm run start` - menjalankan API mode produksi
- `npm run worker` - menjalankan worker dengan nodemon
- `npm run worker:start` - menjalankan worker mode produksi
- `npm run migrate` - menjalankan migrasi database

## Endpoint Publik

- `GET /api/v1/jobs` - daftar lowongan dengan filter
- `GET /api/v1/jobs/:id` - detail lowongan
- `POST /api/v1/cv/preview` - buat sesi preview CV guest di Redis
- `POST /api/v1/chatbot/chat` - chat karier, login opsional untuk konteks CV
- `POST /api/v1/chatbot/tts` - konversi teks ke audio WAV (guest dan user login boleh mengakses)
- `GET /api/v1/chatbot/voices` - daftar suara TTS yang tersedia

## Endpoint Terproteksi

- `GET /api/v1/user/profile` - ambil profil pengguna
- `PUT /api/v1/user/profile` - perbarui profil pengguna
- `DELETE /api/v1/user/profile` - hapus akun pengguna
- `POST /api/v1/cv/analyze` - upload dan analisis CV penuh
- `POST /api/v1/cv/claim` - klaim sesi preview guest setelah login
- `GET /api/v1/cv/status/:task_id` - cek status analisis
- `GET /api/v1/cv/archives` - daftar arsip CV pengguna
- `DELETE /api/v1/cv/archives/:id` - hapus arsip CV dan data analisis terkait
- `GET /api/v1/jobs/recommendations?cv_id=...` - rekomendasi lowongan untuk CV tertentu
- `GET /api/v1/analysis/history` - riwayat analisis
- `GET /api/v1/analysis/:id` - detail analisis

## Endpoint Internal

- `POST /internal/ai/match` - memasukkan job pencocokan AI ke antrean
- `POST /internal/ai/analyze-single` - analisis gap skill satu CV terhadap satu lowongan
- `POST /api/v1/cv/analyze-single` - helper internal untuk analisis gap skill satu CV terhadap satu lowongan

## Autentikasi

Sebagian besar endpoint private memakai JWT Supabase.

```bash
Authorization: Bearer <supabase_jwt_token>
```

## Alur Utama

### 1. Guest preview

1. Pengguna mengunggah PDF atau mengirim `cv_data`.
2. Backend mem-parsing PDF atau mengubah form manual menjadi teks CV.
3. Backend memvalidasi format CV.
4. Backend menyimpan sesi sementara di Redis.
5. Backend mengembalikan hanya `success` dan `temp_token`.

### 2. Analyze / claim

1. Pengguna login lalu memanggil `POST /api/v1/cv/claim`, atau langsung upload ke `POST /api/v1/cv/analyze`.
2. Backend menyimpan arsip CV ke Supabase.
3. Backend membuat task analisis di BullMQ.
4. Worker memproses task dan memanggil layanan AI eksternal.
5. Hasil analisis disimpan ke tabel analisis.
6. Frontend melakukan polling ke `GET /api/v1/cv/status/:task_id`.

### 3. Rekomendasi lowongan

1. Pengguna mengambil daftar arsip CV dari `GET /api/v1/cv/archives`.
2. Pengguna memilih `cv_id` tertentu.
3. Frontend memanggil `GET /api/v1/jobs/recommendations?cv_id=...`.
4. Backend membaca hasil analisis yang sudah tersimpan dan mengembalikan rekomendasi teratas.

### 4. Chatbot

1. Frontend memanggil `POST /api/v1/chatbot/chat`.
2. Jika pengguna punya CV terbaru, backend dapat menambah konteks CV pada pesan.
3. Balasan dibuat oleh Groq.
4. Untuk TTS, backend mengembalikan file WAV biner.

## Struktur Data Utama

- `users` - profil pengguna
- `jobs` - daftar lowongan
- `job_skills` - relasi lowongan ke skill
- `skills` - master skill
- `cv_archives` - arsip CV dan metadata file
- `cv_skills` - skill yang diekstrak dari CV
- `analysis_history` - riwayat rekomendasi per CV
- `analysis_details` - detail skill match/gap per analisis

## Catatan Implementasi

- Guest preview tidak menyimpan preview score, skill gap, atau insight AI.
- `analysis_history` dan `analysis_details` menyimpan `ai_insight` untuk hasil analisis.
- `POST /api/v1/cv/analyze-single` dipakai internal saja sebagai helper/fallback untuk analisis satu lowongan.
- Worker memakai antrean `aiQueue` dan status task disimpan di Redis dengan TTL 7 hari.
- Sesi guest preview di Redis bersifat sementara, sekitar 30 menit.
- Parsing PDF membutuhkan PDF berbasis teks, bukan hasil scan gambar.
- CORS development lebih longgar, sedangkan production memakai whitelist origin.
- Swagger server URL mengikuti `SWAGGER_HOST` dan `SWAGGER_SCHEME` jika tersedia, atau fallback ke localhost / Railway production URL.
- Header internal backend-to-backend memakai `x-internal-request`.

## Format Respons

Sukses umum:

```json
{
  "success": true,
  "data": {}
}
```

Error umum:

```json
{
  "success": false,
  "message": "Pesan error"
}
```

Untuk beberapa endpoint analisis, respons juga bisa memuat `status`, `task_id`, atau `result`.

## File Terkait

- `src/index.js` - entry point aplikasi
- `src/app.js` - konfigurasi Express dan route
- `src/config/swagger.js` - konfigurasi Swagger
- `src/worker.js` - entry point worker
- `src/ai.worker.js` - pemroses job AI
- `src/lib/queue.js` - helper queue BullMQ

## Lisensi

Internal project.
