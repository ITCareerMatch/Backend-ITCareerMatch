# 📄 Dokumentasi Final Arsitektur & Database — ITCareerMatch
> **CC26-PSU088** | Terakhir diperbarui: revisi v2 (post-diskusi flow guest, parsing PDF, input manual)

---

## Daftar Isi

1. [Arsitektur Sistem](#1-arsitektur-sistem)
2. [Pembagian Tanggung Jawab Tim](#2-pembagian-tanggung-jawab-tim)
3. [Struktur Database](#3-struktur-database)
4. [Flow Utama Sistem](#4-flow-utama-sistem)
5. [Queue & Background Processing](#5-queue--background-processing)
6. [Filtering oleh Backend](#6-filtering-oleh-backend)
7. [Input & Output AI](#7-input--output-ai)
8. [Data yang Disimpan Permanen](#8-data-yang-disimpan-permanen)
9. [REST API Structure](#9-rest-api-structure)
10. [Catatan Penting per Endpoint](#10-catatan-penting-per-endpoint)
11. [Keterkaitan Endpoint dengan Tabel DB](#11-keterkaitan-endpoint-dengan-tabel-db)
12. [Authentication](#12-authentication)
13. [Workflow Tim](#13-workflow-tim)
14. [Kesimpulan Final](#14-kesimpulan-final)

---

## 1. Arsitektur Sistem

ITCareerMatch menggunakan pendekatan **Decoupled / Separated Services Architecture**:

| Layer | Teknologi |
|---|---|
| Frontend | React.js |
| Backend Utama | Express.js |
| AI Service | FastAPI + Python |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth + Storage) |
| Temporary Session | Redis (TTL 30 menit) |
| Queue / Worker | BullMQ + Redis *(atau alternatif: Celery, RabbitMQ)* |

**Tujuan arsitektur ini:**
- Menghindari bottleneck di backend utama
- Model SBERT lebih optimal dijalankan secara native di Python
- Mempermudah scaling tiap service secara independen
- Memisahkan tanggung jawab antar tim dengan jelas

```
Frontend (React.js)
     ↓
Backend Express
     ↓
Redis (Temporary Session — TTL 30 menit)
     ↓
Queue / Worker (BullMQ + Redis)
     ↓
AI Service (FastAPI + Python)
     ↓
Supabase (PostgreSQL + Storage)
```

> ⚠️ **Penting:** Frontend **tidak boleh** memanggil AI API secara langsung. Semua request AI harus melalui Backend.

---

## 2. Pembagian Tanggung Jawab Tim

### 🔷 Backend Engineer (BE)

Backend berperan sebagai **penghubung** utama — antara Frontend, Database, dan AI Service.

**Tugas:**
- Menyediakan REST API untuk Frontend
- Verifikasi JWT dari Supabase Auth
- Menerima upload CV (file PDF) atau input manual CV dari user
- **Parsing PDF → plain text (`cv_text`):**
  - Gunakan library Node.js (mis. `pdfjs-dist`) sebagai parsing utama
  - Validasi hasil parsing — cek apakah teks cukup panjang dan meaningful
  - Jika tidak valid → jalankan OCR fallback (mis. Tesseract)
  - Jika hasil OCR juga tidak valid → reject, minta user upload ulang
- **Convert input manual CV → plain text** (`cv_text`) dalam format terstruktur sebelum dikirim ke AI
- Filtering jobs sebelum dikirim ke AI
- Mengatur Queue / Background Task
- Mengelola temporary session di Redis (guest flow)
- Memanggil AI API dan meneruskan hasilnya
- Menyimpan hasil analisis ke database
- Formatting response ke Frontend

> Backend **tidak** menjalankan model AI secara langsung.

---

### 🟣 AI Engineer

AI berjalan sebagai **service terpisah** menggunakan FastAPI + Python.

**Alasan dipisah:**
- SBERT perlu environment Python yang native
- Ekosistem NLP lebih lengkap di Python
- Tidak membebani Express backend
- Lebih scalable dan modular

**Tugas:**
- Membangun **pipeline preprocessing** berdasarkan tahapan yang ditentukan DS
- Preprocessing `cv_text` (menghilangkan noise: umur, alamat, email, dll.)
- Ekstraksi skill dari CV
- Similarity scoring menggunakan SBERT
- Skill gap analysis *(metode masih dikaji: NER atau Gen AI)*
- AI insight & rekomendasi pekerjaan

**Catatan:**
- AI menerima `cv_text` (teks bersih hasil parsing/convert Backend), **bukan PDF mentah**
- `cv_text` bisa berasal dari dua sumber: parsing PDF atau convert input manual — **format yang diterima AI sama**
- Pipeline AI harus cukup robust untuk handle teks yang kurang sempurna (kemungkinan hasil OCR)

---

### 🟢 Data Scientist (DS)

DS bertugas menyiapkan data lowongan kerja dan skill agar siap diproses AI, serta **menentukan tahapan preprocessing** yang akan diimplementasikan AI Engineer ke dalam pipeline.

**Tugas:**
- Scraping & cleaning data lowongan
- **Menentukan tahapan preprocessing** (cleaning → normalisasi → siap diproses model)
- Standarisasi nama skill (contoh: `React`, `react js`, `ReactJS` → dipetakan ke 1 skill ID → dibantu backend di supabase langsung)
- Mengisi tabel `jobs` (untuk tabel `skills`, `job_skills` dibantu backend)
- Quality control dataset

> DS menentukan **apa** yang dilakukan preprocessing. AI Engineer membangun **pipeline-nya**.

---

## 3. Struktur Database

Database dirancang menggunakan PostgreSQL via Supabase dengan prinsip **Master Skill dipisah dari Jobs**.

### Alasan Skill Dipisah ke Tabel Master
Variasi nama skill sangat banyak (~600+ skill ditemukan dari data). Dibutuhkan tabel master `skills` agar:
- Tidak ada duplikasi / typo
- Ada standarisasi ID
- Mempermudah proses matching di AI

Sedangkan untuk **pendidikan** (SMA/D3/S1/S2), pilihannya terbatas sehingga AI bisa langsung compare teks tanpa tabel master khusus.

---

### Schema Database (DBML)

```dbml
// ITCareerMatch Database Schema — Final Optimized v2
// AI Career Matching Platform — CC26-PSU088

Project ITCareerMatch {
  database_type: 'PostgreSQL'
}

// ─────────────────────────────────────────
// AUTH SYSTEM (Dikelola Supabase Auth)
// ─────────────────────────────────────────
Table auth_users {
  id uuid [pk, note: 'Managed by Supabase Auth']
}

// ─────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────
Table users {
  id           uuid        [primary key, note: 'References auth.users.id']
  name         varchar
  email        varchar     [unique, not null]
  auth_provider varchar    [note: 'email | google']
  gender       varchar(1)  [note: 'L | P']
  avatar_url   text
  is_verified  boolean     [default: false]
  created_at   timestamp   [default: `now()`]
  updated_at   timestamp
}

// ─────────────────────────────────────────
// MASTER DATA
// ─────────────────────────────────────────
Table skills {
  id   uuid    [primary key, default: `gen_random_uuid()`]
  name varchar [unique, not null]
}

// ─────────────────────────────────────────
// JOB DATA
// ─────────────────────────────────────────
Table jobs {
  id               uuid    [primary key, default: `gen_random_uuid()`]
  title            varchar [not null]
  company_name     varchar [not null]
  external_url     text
  category         varchar
  education_level  text
  experience_level varchar
  job_type         varchar [note: 'Full-time | Contract | Part-time | dll']
  work_system      varchar [note: 'On-site | Remote | Hybrid']
  gender_required  varchar [note: 'male | female | both']
  location         varchar
  city             varchar
  province         varchar
  salary_raw       text
  salary_min       bigint
  salary_max       bigint
  age_note         text
  min_age          int
  max_age          int
  requirements     text
  is_active        boolean   [default: true]
  created_at       timestamp [default: `now()`]
  updated_at       timestamp
}

// Junction Table: Job ↔ Skill (Many-to-Many)
Table job_skills {
  job_id   uuid [pk]
  skill_id uuid [pk]
}

// ─────────────────────────────────────────
// USER CV DATA
// ─────────────────────────────────────────
Table cv_archives {
  id        uuid      [primary key, default: `gen_random_uuid()`]
  user_id   uuid      [not null]
  file_url  text      [note: 'Null jika sumber dari input manual']
  file_name varchar   [note: 'Null jika sumber dari input manual']
  cv_source varchar   [note: 'upload | manual']
  raw_text  text      [note: 'Hasil parsing PDF atau convert form input → text']
  status    varchar   [note: 'processing | active | archived']
  uploaded_at timestamp [default: `now()`]
}

// Hasil Ekstraksi Skill dari CV oleh AI
Table cv_skills {
  cv_id      uuid    [pk]
  skill_id   uuid    [pk]
  confidence decimal [note: 'AI confidence score: 0.0 – 1.0']
}

// ─────────────────────────────────────────
// AI ANALYSIS & RESULTS
// ─────────────────────────────────────────
Table analysis_history {
  id                  uuid      [primary key, default: `gen_random_uuid()`]
  user_id             uuid      [not null]
  cv_id               uuid      [not null]
  job_id              uuid      [not null]
  match_score         decimal   [note: '0 – 100']
  job_title_snapshot  varchar   [note: 'Snapshot agar histori tetap akurat walau job dihapus']
  company_snapshot    varchar
  analyzed_at         timestamp [default: `now()`]
}

Table analysis_details {
  id                  uuid    [primary key, default: `gen_random_uuid()`]
  analysis_id         uuid    [not null]
  skill_id            uuid    [not null]
  skill_name_snapshot varchar [note: 'Snapshot nama skill']
  status              varchar [note: 'match | gap']
  ai_insight          text    [note: 'Contoh: "Python kamu cocok dengan syarat loker ini"']
}

// ─────────────────────────────────────────
// RELATIONSHIPS
// ─────────────────────────────────────────
Ref: users.id             - auth_users.id         [delete: cascade]
Ref: cv_archives.user_id  > users.id
Ref: analysis_history.user_id > users.id
Ref: cv_skills.cv_id      > cv_archives.id
Ref: analysis_history.cv_id > cv_archives.id
Ref: job_skills.job_id    > jobs.id
Ref: analysis_history.job_id > jobs.id
Ref: job_skills.skill_id  > skills.id
Ref: cv_skills.skill_id   > skills.id
Ref: analysis_details.skill_id > skills.id
Ref: analysis_details.analysis_id > analysis_history.id
```

---

## 4. Flow Utama Sistem

### FLOW A — Guest (Preview Mode)

User bisa memilih: **upload file CV** atau **isi input manual CV**.

```
1.  Guest upload PDF atau isi form input manual via Frontend
2a. [Jika upload PDF]
    Backend parsing PDF → cv_text
    → Validasi teks: cukup panjang & meaningful?
    → Jika tidak valid → OCR fallback
    → Jika OCR juga tidak valid → reject, minta upload ulang
2b. [Jika input manual]
    Backend convert form fields → cv_text (plain text terstruktur)
3.  Backend kirim cv_text ke AI (tanpa job matching)
4.  AI:
    - Preprocessing cv_text
    - Ekstraksi skill
    - Skill gap analysis
    - AI insight
    - Hitung preview score
5.  Backend simpan sementara ke Redis (TTL 30 menit):
    - raw_text
    - extracted_skills
    - skill_gap
    - ai_insight
    - preview_score
    - temp_token
6.  Backend return ke Frontend:
    - preview_score
    - jumlah skill cocok & gap
    - preview singkat skill & insight (sebagian di-blur)
    - temp_token
7.  Frontend tampilkan preview + CTA:
    "Daftar gratis untuk melihat detail lengkap & rekomendasi pekerjaan"
```

---

### FLOW B — Setelah Register / Login

```
1.  User register atau login
2.  Frontend kirim temp_token ke Backend
3.  Backend ambil session dari Redis menggunakan temp_token
4.  Jika session masih valid (belum expired 30 menit):
    → Attach ke user_id
    → Simpan raw_text ke cv_archives
    → Masukkan task ke Queue (BullMQ/Redis)
5.  Jika session sudah expired:
    → Minta user upload/input ulang CV
6.  Worker memanggil AI API dengan:
    - cv_text (dari Redis session)
    - filtered_jobs (hasil hard filter Backend)
7.  AI hitung SBERT similarity → Top-20 job matching
8.  Backend simpan hasil permanen:
    - cv_skills
    - analysis_history
    - analysis_details
9.  Frontend polling /status/:task_id sampai completed
10. Frontend tampilkan Top-20 rekomendasi + detail analisis per job
```

---

### FLOW C — User Login (Analisis Baru)

User yang sudah login bisa kapan saja upload/input CV baru.

```
1.  User upload PDF atau isi form input manual via Frontend
2a. [Jika upload PDF]
    Backend parsing PDF → cv_text (pipeline sama dengan Flow A)
2b. [Jika input manual]
    Backend convert form fields → cv_text
3.  Backend simpan file ke Supabase Storage (jika upload PDF)
4.  Backend simpan metadata ke cv_archives
5.  Backend masukkan task ke Queue
6.  Backend return task_id ke Frontend
7.  Worker memanggil AI API (full analysis + job matching)
8.  AI: Preprocessing → Ekstraksi Skill → SBERT Scoring → Skill Gap
9.  Backend simpan hasil ke cv_skills, analysis_history, analysis_details
10. Frontend polling /status/:task_id sampai completed
11. Frontend tampilkan Top-20 rekomendasi + detail analisis
```

---

## 5. Queue & Background Processing

**Keputusan:** Menggunakan **asynchronous/queue**.

**Alasan:**
- Parsing PDF dan komputasi SBERT membutuhkan waktu yang cukup lama
- Jika dipaksa synchronous → rawan timeout, UX buruk
- Dengan queue, user bisa langsung lanjut tanpa stuck di loading

**Flow Queue (authenticated user):**
```
Upload/Input CV → masuk Queue → AI Processing → Completed → Frontend polling hasil
```

**Flow Guest (tidak pakai queue):**
```
Upload/Input CV → AI Processing (tanpa job matching) → Simpan ke Redis → Return preview
```

> Guest flow tidak menggunakan queue karena prosesnya lebih ringan (tanpa job matching) dan hasilnya perlu langsung dikembalikan ke Frontend.

**Status yang disimpan di `cv_archives`:**

| Status | Keterangan |
|---|---|
| `processing` | CV sedang diproses AI |
| `active` | Analisis selesai, hasil tersedia |
| `archived` | CV lama yang sudah tidak aktif |

**Redis Temporary Session (guest):**

| Field | Keterangan |
|---|---|
| `temp_token` | Token unik untuk claim session |
| `raw_text` | Teks hasil parsing / convert input manual |
| `extracted_skills` | Skill hasil ekstraksi AI |
| `skill_gap` | Skill gap hasil analisis AI |
| `ai_insight` | Insight dari AI |
| `preview_score` | Skor kecocokan preview |
| TTL | **30 menit** sejak dibuat |

**Tools yang dipertimbangkan:** BullMQ + Redis, Celery, RabbitMQ *(perlu eksperimen lebih lanjut)*

---

## 6. Filtering oleh Backend

Sebelum mengirimkan data ke AI (khusus authenticated user — full analysis), Backend melakukan **hard filtering** jobs terlebih dahulu.

**Kriteria filter:**
| Field | Keterangan |
|---|---|
| `education_level` | Minimal pendidikan yang disyaratkan |
| `gender_required` | Kesesuaian gender user |
| `location / city` | Kesesuaian lokasi |
| `min_age / max_age` | Kesesuaian umur |
| `experience_level` | Level pengalaman |

**Tujuan:** Mengurangi jumlah job yang dikirim ke AI sehingga SBERT hanya memproses job yang memang sudah memenuhi kualifikasi dasar → lebih cepat, lebih efisien.

> Guest flow **tidak** melakukan job filtering karena tidak ada job matching di preview.

---

## 7. Input & Output AI

### Input yang Dikirim Backend ke AI

**Guest (preview only):**

| Field | Keterangan |
|---|---|
| `cv_text` | Hasil parsing PDF atau convert input manual → plain text |

**Authenticated user (full analysis):**

| Field | Keterangan |
|---|---|
| `cv_text` | Hasil parsing PDF atau convert input manual → plain text |
| `user_id` | Untuk menyimpan hasil analisis |
| `filtered_jobs` | Daftar jobs yang sudah lolos hard filter |
| `cv_id` | Untuk referensi penyimpanan |

> ⚠️ AI **tidak** menerima file PDF secara langsung. Backend wajib melakukan parsing/convert terlebih dahulu.
> ⚠️ `cv_text` yang diterima AI **selalu plain text** — baik dari upload PDF maupun input manual. Format yang diterima AI sama untuk kedua sumber.

---

### Format `cv_text` dari Input Manual

Ketika user mengisi form manual, Backend mengkonversi field-field tersebut ke format teks terstruktur sebelum dikirim ke AI. Contoh:

```
Nama: Budi Santoso
Pendidikan: S1 Informatika, Universitas XYZ, 2020-2024
Pengalaman: 2 tahun sebagai Data Analyst di PT Teknologi Maju
Skill: Python, SQL, Tableau, Excel
Deskripsi tambahan: Berpengalaman dalam analisis data dan visualisasi dashboard
```

> Format ini memastikan pipeline AI dapat memproses input manual dengan cara yang sama seperti teks dari PDF.

---

### Output yang Dikembalikan AI ke Backend

**Guest (preview):**
```json
{
  "preview_score": 70,
  "extracted_skills": ["Python", "SQL", "Tableau"],
  "skill_gap": ["Spark", "AWS", "Docker"],
  "ai_insight": [
    "Skill Python dan SQL kamu sudah solid.",
    "Pertimbangkan untuk mempelajari Spark.",
    "AWS akan meningkatkan daya saing kamu."
  ]
}
```

**Authenticated user (full analysis):**
```json
{
  "cv_id": "uuid",
  "user_id": "uuid",
  "extracted_skills": ["Python", "TensorFlow", "SQL"],
  "recommendations": [
    {
      "job_id": "uuid",
      "job_title": "Data Scientist",
      "company": "PT. Teknologi Maju",
      "match_score": 85.4,
      "skill_match": ["Python", "SQL"],
      "skill_gap": ["Spark", "AWS"],
      "ai_insight": "Skill Python dan SQL kamu sangat sesuai. Pertimbangkan untuk mempelajari Spark agar lebih kompetitif."
    },
    {
      "job_id": "uuid",
      "job_title": "ML Engineer",
      "company": "Startup AI",
      "match_score": 77.2,
      "skill_match": ["Python", "TensorFlow"],
      "skill_gap": ["Docker", "Kubernetes"],
      "ai_insight": "Background ML kamu bagus. Docker dan Kubernetes adalah skill yang perlu ditingkatkan."
    }
  ]
}
```

**Keputusan display:** Menampilkan **Top-20 jobs** *(bukan threshold >70%)* agar user dengan CV yang belum optimal tetap mendapat rekomendasi yang berguna.

---

## 8. Data yang Disimpan Permanen

| Tabel | Data yang Disimpan | Alasan |
|---|---|---|
| `cv_archives.raw_text` | Teks hasil parsing PDF atau convert input manual | Agar tidak parsing/convert ulang di analisis berikutnya |
| `cv_archives.cv_source` | Sumber CV: `upload` atau `manual` | Tracking asal data CV |
| `cv_skills` | Skill hasil ekstraksi AI + confidence score | Cache skill user |
| `analysis_history` | match_score per job_id, snapshot title & company | Riwayat analisis yang bisa dibuka ulang |
| `analysis_details` | skill match, skill gap, ai_insight per skill | Detail lengkap yang bisa ditampilkan di halaman job detail |

**Benefit:** Kalau user membuka kembali hasil analisis job tertentu di hari lain, data langsung tersedia tanpa perlu proses ulang AI.

> **Guest data tidak disimpan permanen** — hanya di Redis dengan TTL 30 menit. Jika session expired, user perlu upload/input ulang.

---

## 9. REST API Structure
> **Catatan Arsitektur:**
> - Semua endpoint backend diawali `/api/v1/` (versioning)
> - Frontend **tidak boleh** memanggil AI API secara langsung
> - Internal endpoint hanya bisa dipanggil Backend → AI Service
> - Apply pekerjaan dilakukan via `external_url` dari data job (redirect ke platform eksternal seperti Glints, LinkedIn, dll.) — **tidak ada endpoint apply di backend kita**

### A. Public Endpoints *(Tanpa JWT)*

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/api/v1/cv/preview` | Upload PDF atau submit input manual CV (guest). BE parsing/convert → kirim ke AI (tanpa job matching) → simpan sementara ke Redis (TTL 30 menit) → return `preview_score`, `preview_summary`, `temp_token` |
| `GET` | `/api/v1/jobs` | List semua lowongan aktif (pagination) |
| `GET` | `/api/v1/jobs/:id` | Detail info lowongan: deskripsi, requirement, lokasi, dll. (data statis dari tabel `jobs`) |

---

### B. Protected Endpoints *(Perlu JWT Supabase)*

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/v1/user/profile` | Ambil data profil user yang sedang login |
| `POST` | `/api/v1/cv/analyze` | Upload PDF atau submit input manual CV (authenticated). BE parsing/convert → simpan ke `cv_archives` → trigger full AI analysis via queue → return `task_id` |
| `POST` | `/api/v1/cv/claim` | Claim temporary session setelah login. FE kirim `temp_token` → BE ambil dari Redis → lanjut full analysis → return `task_id` |
| `GET` | `/api/v1/cv/status/:task_id` | Cek status antrian AI: `processing` / `completed` / `failed` |
| `GET` | `/api/v1/jobs/recommendations` | List Top-20 lowongan yang paling cocok dengan CV user, diurutkan berdasarkan `match_score` — **personal per user** |
| `GET` | `/api/v1/analysis/history` | List seluruh riwayat analisis yang pernah dilakukan user |
| `GET` | `/api/v1/analysis/:id` | Detail hasil AI untuk satu analisis: skill match, skill gap, AI insight (data dari `analysis_history` + `analysis_details`) |

---

### C. Internal Endpoints *(Backend → AI Service saja)*

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/internal/ai/preview` | Preview analysis (guest): preprocessing + ekstraksi skill + skill gap + insight. Tanpa job matching |
| `POST` | `/internal/ai/extract` | Ekstraksi skill dari `cv_text` → mapping ke tabel `skills` |
| `POST` | `/internal/ai/match` | Hitung SBERT similarity antara `cv_text` dan `filtered_jobs` → return scoring + skill gap |

> Frontend **tidak boleh** mengakses endpoint internal ini secara langsung.

---

## 10. Catatan Penting per Endpoint

### POST /api/v1/cv/preview vs POST /api/v1/cv/analyze vs POST /api/v1/cv/claim

Tiga endpoint ini berbeda tujuan dan perilakunya secara fundamental:

| | `/cv/preview` | `/cv/analyze` | `/cv/claim` |
|---|---|---|---|
| **Siapa** | Guest | User login | User login (setelah lihat preview) |
| **Input** | Upload PDF atau form manual | Upload PDF atau form manual | `temp_token` dari preview |
| **CV disimpan?** | ❌ Tidak — hanya di Redis TTL 30 menit | ✅ Ya — ke `cv_archives` | ✅ Ya — ambil dari Redis, simpan ke `cv_archives` |
| **Job matching?** | ❌ Tidak | ✅ Ya (Top-20) | ✅ Ya (Top-20) |
| **Hasil disimpan?** | ❌ Tidak (Redis saja) | ✅ Ya — ke `analysis_history` & `analysis_details` | ✅ Ya — ke `analysis_history` & `analysis_details` |
| **Output** | Preview score + summary + `temp_token` | `task_id` untuk polling | `task_id` untuk polling |
| **Bisa diakses ulang?** | ❌ Tidak (expired 30 menit) | ✅ Ya, lewat `/analysis/history` | ✅ Ya, lewat `/analysis/history` |

> **Kenapa ada `/cv/claim`?** Agar guest yang sudah melihat preview tidak perlu upload/input ulang setelah login. BE cukup ambil data dari Redis menggunakan `temp_token` dan melanjutkan ke full analysis. Jika `temp_token` sudah expired (>30 menit), user diminta upload/input ulang.

---

### Parsing PDF — Pipeline di Backend

```
Upload PDF
   ↓
Parsing dengan pdf-parse (atau library utama)
   ↓
Validasi teks hasil parsing
(cukup panjang? meaningful?)
   ↓
[Valid] → cv_text siap dikirim ke AI
   ↓
[Tidak valid] → OCR fallback (Tesseract atau sejenisnya)
   ↓
Validasi teks hasil OCR
   ↓
[Valid] → cv_text siap dikirim ke AI
   ↓
[Tidak valid] → Reject, return error ke Frontend
("CV tidak dapat dibaca. Coba upload file PDF dengan format yang lebih sederhana.")
```

> **Catatan:** OCR tidak menjamin teks yang dihasilkan 100% runtut, terutama untuk CV multi-kolom. Pipeline AI harus cukup robust untuk handle teks yang kurang sempurna.

---

### Input Manual CV — Konversi di Backend

Ketika user memilih isi form manual, Backend mengkonversi data form ke `cv_text` sebelum dikirim ke AI:

```
Form Input (JSON dari Frontend)
   ↓
Backend: Convert → plain text terstruktur
   ↓
cv_text siap dikirim ke AI (format sama dengan hasil parsing PDF)
```

> Ini memastikan pipeline AI tidak perlu membedakan sumber input. AI selalu menerima `cv_text` dalam format plain text.

---

### GET /api/v1/jobs/:id vs GET /api/v1/analysis/:id

| | `/jobs/:id` | `/analysis/:id` |
|---|---|---|
| **Isi** | Info statis lowongan (dari tabel `jobs`) | Hasil AI untuk user ini (dari `analysis_history` + `analysis_details`) |
| **Personal?** | ❌ Sama untuk semua user | ✅ Berbeda per user |
| **Perlu login?** | ❌ Public | ✅ Protected (JWT) |
| **Contoh isi** | Judul, perusahaan, lokasi, requirement, `external_url` | Match score, skill match, skill gap, AI insight |

Keduanya bisa ditampilkan **bersama** di halaman detail lowongan — FE cukup hit dua endpoint dan gabungkan hasilnya.

---

### GET /api/v1/jobs/recommendations

Ini bukan sekadar list semua job — ini adalah **hasil personalisasi AI**:
- Hanya tersedia setelah user pernah melakukan analisis CV (`POST /cv/analyze` atau `POST /cv/claim`)
- Diurutkan berdasarkan `match_score` dari tabel `analysis_history`
- Menampilkan maksimal Top-20 job terbaik untuk user tersebut
- Berbeda antar user karena berdasarkan CV masing-masing

---

### Fitur yang Di-cut dari Scope (Deadline 3 Minggu)

Fokus core fitur saat ini:
- ✅ Job Recommendation
- ✅ Similarity Score
- ✅ Skill Gap Analysis
- ✅ Guest Preview (tanpa job matching)

| Fitur | Status | Alasan |
|---|---|---|
| `POST /api/v1/cv/optimize` | ⏳ Fitur lanjutan | Bukan core, dikerjakan setelah deadline utama |
| `POST /api/v1/chatbot` | ❌ Di-cut dari scope | Butuh lebih banyak waktu (Gen AI), tidak masuk deadline 3 minggu |

---

## 11. Keterkaitan Endpoint dengan Tabel DB

| Endpoint | Tabel / Storage yang Terlibat |
|---|---|
| `POST /api/v1/cv/preview` | Redis (temporary session, TTL 30 menit) |
| `POST /api/v1/cv/analyze` | `cv_archives`, `cv_skills`, `analysis_history`, `analysis_details` |
| `POST /api/v1/cv/claim` | Redis (read + delete), `cv_archives`, `cv_skills`, `analysis_history`, `analysis_details` |
| `GET /api/v1/cv/status/:task_id` | `cv_archives` (kolom `status`) |
| `GET /api/v1/jobs` | `jobs`, `job_skills`, `skills` |
| `GET /api/v1/jobs/:id` | `jobs`, `job_skills`, `skills` |
| `GET /api/v1/jobs/recommendations` | `analysis_history`, `jobs` |
| `GET /api/v1/analysis/history` | `analysis_history` |
| `GET /api/v1/analysis/:id` | `analysis_history`, `analysis_details`, `skills` |
| `GET /api/v1/user/profile` | `users` |

---

## 12. Authentication

**Menggunakan Supabase Auth.**

**Flow:**
1. Login / Register ditangani oleh Supabase Auth
2. Frontend menyimpan JWT yang diberikan Supabase
3. Frontend menyertakan JWT di header setiap request ke Backend
4. Backend hanya melakukan **verifikasi JWT** via middleware

```
Frontend → Request + JWT Header → Backend Middleware → Verify JWT → Lanjut ke Handler
```

**Guest flow tidak memerlukan JWT.** Identifikasi guest dilakukan via `temp_token` yang dikembalikan dari `/cv/preview`.

Protected route menggunakan middleware JWT verification di Express.

---

## 13. Workflow Tim

### 🔷 Frontend (FE)
1. Slicing UI dari desain
2. Integrasi dengan mock API / Swagger docs
3. Implementasi auth Supabase di sisi client
4. State management — termasuk penyimpanan `temp_token` sementara di memory/localStorage
5. Polling status antrian AI
6. Handle flow: preview → register/login → claim → full analysis

> FE **tidak perlu menunggu BE selesai** — bisa mulai dengan mock JSON dan endpoint contract dari Swagger.

---

### 🔷 Backend (BE)
Prioritas awal:
1. Auth middleware (JWT verification)
2. PDF Parser pipeline (parse → validasi → OCR fallback)
3. Input manual CV converter (form JSON → plain text)
4. Endpoint structure & Swagger docs
5. Redis setup (temporary session, TTL 30 menit)
6. Queue system (BullMQ + Redis)
7. Integrasi Supabase Storage & DB
8. Integrasi AI API

---

### 🟣 AI Engineer
Prioritas awal:
1. **Implementasi pipeline preprocessing** (berdasarkan tahapan dari DS)
2. Ekstraksi skill *(NER atau Gen AI — masih dikaji)*
3. Implementasi SBERT untuk similarity scoring
4. Skill gap analysis
5. Bangun FastAPI service — dua mode: **preview** (tanpa job matching) dan **full analysis**
6. Definisikan schema response (JSON output) — untuk kedua mode
7. Pastikan pipeline robust untuk handle teks dari OCR (tidak selalu sempurna)

---

### 🟢 Data Scientist (DS)
Prioritas awal:
1. Cleaning dataset hasil scraping
2. **Menentukan tahapan preprocessing** (cleaning → normalisasi → siap diproses model)
3. Standarisasi dan mapping skill
4. Populasi tabel `jobs`, `skills`, `job_skills`
5. Quality control data

---

## 14. Kesimpulan Final

### Keputusan-Keputusan yang Telah Disepakati

| Topik | Keputusan |
|---|---|
| Integrasi AI | FastAPI terpisah, bukan tensorflow.js di client |
| Parsing PDF | Tugas Backend — library Node.js utama + OCR fallback jika parsing gagal validasi |
| Input CV | Dua opsi: upload PDF atau isi form manual — keduanya dikonversi ke `cv_text` oleh BE |
| OCR fallback | Diimplementasi di BE. Tidak menjamin hasil 100% runtut; pipeline AI harus robust |
| File scan reject | Jika hasil OCR juga tidak lolos validasi → reject, minta user upload ulang |
| Pipeline preprocessing | Ditentukan DS, diimplementasikan AI Engineer |
| Input ke AI | `cv_text` (plain text) — baik dari parsing PDF maupun convert input manual |
| Guest flow | Preview tanpa job matching → hasil disimpan sementara di **Redis TTL 30 menit** |
| Claim session | `/cv/claim` dengan `temp_token` — lanjut full analysis tanpa upload ulang (jika belum expired) |
| Session expired | User diminta upload/input ulang CV |
| Proses analisis (authenticated) | **Asynchronous / Queue** (BullMQ + Redis) |
| Proses analisis (guest preview) | Synchronous, langsung return — tidak pakai queue |
| Display rekomendasi | **Top-20 jobs** (bukan threshold >70%) |
| Master skill | Dipisah ke tabel `skills` tersendiri |
| Pendidikan & pengalaman | Di-compare secara teks, tanpa tabel master |
| Data tersimpan permanen | `raw_text`, `cv_source`, `cv_skills`, `analysis_history`, `analysis_details` |
| Auth | Supabase Auth + JWT verification di BE |
| Swagger | Digunakan sebagai kontrak FE ↔ BE |
| Scope fitur (deadline 3 minggu) | **Core only**: Job Recommendation, Similarity Score, Skill Gap Analysis, Guest Preview |
| Chatbot | ❌ Di-cut — butuh waktu lebih, tidak masuk deadline |

### Flow Akhir Sistem

```
[GUEST]
User Upload PDF / Isi Form Manual
     ↓
Backend: Parsing PDF → validasi → OCR fallback jika perlu
         ATAU convert form manual → cv_text
     ↓
AI: Preprocessing → Ekstraksi Skill → Skill Gap → Insight → Preview Score
     ↓
Backend: Simpan sementara ke Redis (TTL 30 menit) + return temp_token
     ↓
Frontend: Tampilkan preview (score, skill cocok/gap, insight sebagian blur)
     ↓
User register / login
     ↓
Frontend kirim temp_token → Backend claim session dari Redis
     ↓
[LANJUT KE FULL ANALYSIS ↓]

[AUTHENTICATED — full analysis]
Backend: Hard Filtering Jobs (gender, umur, lokasi, pendidikan)
     ↓
Masuk Queue (BullMQ + Redis)
     ↓
Worker: Panggil AI API dengan cv_text + filtered_jobs
     ↓
AI: SBERT Scoring → Top-20 Job Matching
     ↓
Backend: Simpan hasil ke DB (cv_archives, cv_skills, analysis_history, analysis_details)
     ↓
Frontend: Polling status → Tampilkan Top-20 Rekomendasi + Detail Analisis per Job
```

---

*Dokumen ini disusun berdasarkan hasil diskusi tim ITCareerMatch di Discord. Apabila ada perubahan keputusan, harap update dokumen ini agar seluruh tim tetap sinkron.*
