# 📄 Dokumentasi Final Arsitektur & Database — ITCareerMatch
> **CC26-PSU088** | Terakhir diperbarui berdasarkan hasil diskusi tim (Discord)

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
- Menerima upload CV dari user
- Parsing PDF → plain text (`cv_text`)
- Filtering jobs sebelum dikirim ke AI
- Mengatur Queue / Background Task
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
- Preprocessing `cv_text` (menghilangkan noise: umur, alamat, email, dll.)
- Ekstraksi skill dari CV
- Similarity scoring menggunakan SBERT
- Skill gap analysis *(metode masih dikaji: NER atau Gen AI)*
- AI insight & rekomendasi pekerjaan

**Catatan:** AI hanya menerima request dari Backend. Input yang diterima adalah **teks** (bukan PDF mentah).

---

### 🟢 Data Scientist (DS)

DS bertugas menyiapkan data lowongan kerja dan skill agar siap diproses AI.

**Tugas:**
- Scraping & cleaning data lowongan
- Standarisasi nama skill (contoh: `React`, `react js`, `ReactJS` → dipetakan ke 1 skill ID → dibantu backend di supabase langsung)
- Mengisi tabel `jobs` ( untuk tabel `skills`, `job_skills` dibantu backend)
- Quality control dataset

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
// ITCareerMatch Database Schema — Final Optimized
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
  file_url  text
  file_name varchar
  raw_text  text      [note: 'Hasil parsing PDF → text, agar tidak perlu re-parsing']
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
Ref: users.id           - auth_users.id       [delete: cascade]
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

### FLOW — User Upload CV

```
1.  User upload file PDF CV via Frontend
2.  Backend menerima file → upload ke Supabase Storage
3.  Backend simpan metadata ke tabel cv_archives
4.  Backend parsing PDF → cv_text (plain text)
5.  Backend simpan cv_text ke kolom raw_text di cv_archives
6.  Backend memasukkan task ke Queue (BullMQ/Redis)
7.  Backend return task_id ke Frontend (user tidak perlu nunggu)
8.  Worker/background process memanggil AI API
9.  AI melakukan preprocessing cv_text (hapus noise)
10. AI ekstraksi skill → mapping ke tabel skills
11. AI hitung similarity score dengan filtered_jobs (SBERT)
12. AI kembalikan hasil analisis ke Backend
13. Backend simpan hasil ke cv_skills, analysis_history, analysis_details
14. Frontend polling endpoint /status/:task_id sampai status = completed
15. Frontend menampilkan rekomendasi job + detail analisis
```

---

## 5. Queue & Background Processing

**Keputusan:** Menggunakan **asynchronous/queue**.

**Alasan:**
- Parsing PDF dan komputasi SBERT membutuhkan waktu yang cukup lama
- Jika dipaksa synchronous → rawan timeout, UX buruk
- Dengan queue, user bisa langsung lanjut tanpa stuck di loading

**Flow Queue:**
```
Upload CV → masuk Queue → AI Processing → Completed → Frontend polling hasil
```

**Status yang disimpan di `cv_archives`:**

| Status | Keterangan |
|---|---|
| `processing` | CV sedang diproses AI |
| `active` | Analisis selesai, hasil tersedia |
| `archived` | CV lama yang sudah tidak aktif |

**Tools yang dipertimbangkan:** BullMQ + Redis, Celery, RabbitMQ *(perlu eksperimen lebih lanjut)*

---

## 6. Filtering oleh Backend

Sebelum mengirimkan data ke AI, Backend melakukan **hard filtering** jobs terlebih dahulu.

**Kriteria filter:**
| Field | Keterangan |
|---|---|
| `education_level` | Minimal pendidikan yang disyaratkan |
| `gender_required` | Kesesuaian gender user |
| `location / city` | Kesesuaian lokasi |
| `min_age / max_age` | Kesesuaian umur |
| `experience_level` | Level pengalaman |

**Tujuan:** Mengurangi jumlah job yang dikirim ke AI sehingga SBERT hanya memproses job yang memang sudah memenuhi kualifikasi dasar → lebih cepat, lebih efisien.

---

## 7. Input & Output AI

### Input yang Dikirim Backend ke AI

| Field | Keterangan |
|---|---|
| `cv_text` | Hasil parsing PDF ke teks (bukan PDF mentah) |
| `user_id` | Untuk menyimpan hasil analisis |
| `filtered_jobs` | Daftar jobs yang sudah lolos hard filter |
| `cv_id` *(optional)* | Untuk referensi penyimpanan |

> ⚠️ AI **tidak** menerima file PDF secara langsung. Backend wajib melakukan parsing PDF → text sebelum mengirim ke AI.

---

### Output yang Dikembalikan AI ke Backend

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
| `cv_archives.raw_text` | Teks hasil parsing PDF | Agar tidak parsing ulang di analisis berikutnya |
| `cv_skills` | Skill hasil ekstraksi AI + confidence score | Cache skill user |
| `analysis_history` | match_score per job_id, snapshot title & company | Riwayat analisis yang bisa dibuka ulang |
| `analysis_details` | skill match, skill gap, ai_insight per skill | Detail lengkap yang bisa ditampilkan di halaman job detail |

**Benefit:** Kalau user membuka kembali hasil analisis job tertentu di hari lain, data langsung tersedia tanpa perlu proses ulang AI.

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
| `POST` | `/api/v1/cv/upload` | Upload CV guest, parsing di memory, return skor singkat sebagai preview — **tidak ada yang disimpan ke DB, CV langsung dibuang setelah response dikirim** |
| `GET` | `/api/v1/jobs` | List semua lowongan aktif (pagination) |
| `GET` | `/api/v1/jobs/:id` | Detail info lowongan: deskripsi, requirement, lokasi, dll. (data statis dari tabel `jobs`) |

---

### B. Protected Endpoints *(Perlu JWT Supabase)*

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/user/profile` | Ambil data profil user |
| `POST` | `/api/cv/analyze` | Jalankan proses AI *(async)*, return `task_id` |
| `GET` | `/api/cv/status/:task_id` | Cek status antrian AI *(polling)* |
| `GET` | `/api/analysis/history` | List riwayat analisis user |
| `GET` | `/api/analysis/:id` | Detail analisis: match, gap, AI insight |
| `GET` | `/api/jobs/recommendations` | Top-20 job berdasarkan match_score |
| `POST` | `/api/cv/optimize` | Optimasi CV dengan AI |
| `POST` | `/api/jobs/:id/apply` | Lamar pekerjaan |
| `POST` | `/api/chatbot` | Chat AI berbasis konteks CV + Job |

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/v1/user/profile` | Ambil data profil user yang sedang login |
| `POST` | `/api/v1/cv/analyze` | Upload CV user (login), simpan ke `cv_archives`, trigger proses AI secara async → return `task_id` untuk polling |
| `GET` | `/api/v1/cv/status/:task_id` | Cek status antrian AI: `processing` / `completed` / `failed` |
| `GET` | `/api/v1/analysis/history` | List seluruh riwayat analisis yang pernah dilakukan user |
| `GET` | `/api/v1/analysis/:id` | Detail hasil AI untuk satu analisis: skill match, skill gap, AI insight (data dari `analysis_history` + `analysis_details`) |
| `GET` | `/api/v1/jobs/recommendations` | List Top-20 lowongan yang paling cocok dengan CV user, diurutkan berdasarkan `match_score` — **personal per user** |
| `POST` | `/api/chatbot` | Chat AI berbasis konteks CV + Job |

---

### C. Internal Endpoints *(Backend → AI Service saja)*

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/internal/ai/extract` | Ekstraksi skill dari `cv_text` → mapping ke tabel `skills` |
| `POST` | `/internal/ai/match` | Hitung SBERT similarity antara `cv_text` dan `filtered_jobs` → return scoring + skill gap |

> Frontend **tidak boleh** mengakses endpoint internal ini secara langsung.

---

## 10. Catatan Penting per Endpoint
 
### POST /api/v1/public/cv/upload vs POST /api/v1/cv/analyze
 
Dua endpoint ini berbeda tujuan dan perilakunya secara fundamental:
 
| | Public Upload | Protected Analyze |
|---|---|---|
| **Siapa** | Guest (belum login) | User yang sudah login |
| **CV disimpan?** | ❌ Tidak — diproses di memory, langsung dibuang | ✅ Ya — disimpan ke `cv_archives` (termasuk `raw_text`) |
| **Hasil disimpan?** | ❌ Tidak | ✅ Ya — ke `analysis_history` & `analysis_details` |
| **Output** | Skor singkat / preview saja | Analisis lengkap + riwayat tersimpan |
| **Bisa diakses ulang?** | ❌ Tidak | ✅ Ya, lewat `/analysis/history` |
| **Perlu upload ulang setelah login?** | ✅ Ya, kalau mau analisis lengkap | — |
 
> **Kenapa begini?** Mengacu dari diskusi tim (Ulil): tujuan menyimpan `extracted_cv` / `raw_text` adalah *"agar saat user mencari rekomendasi job lagi di hari lain, AI tidak perlu mengulang proses dari nol."* Konteks ini sudah jelas untuk user yang punya akun — bukan guest. Skenario "klaim CV guest setelah login" tidak pernah dibahas dan menambah kompleksitas yang tidak perlu untuk saat ini.
 
---
 
### GET /api/v1/jobs/:id vs GET /api/v1/analysis/:id
 
Dua endpoint ini sering dikira sama, tapi isinya sangat berbeda:
 
| | `/jobs/:id` | `/analysis/:id` |
|---|---|---|
| **Isi** | Info statis lowongan (dari tabel `jobs`) | Hasil AI untuk user ini (dari `analysis_history` + `analysis_details`) |
| **Personal?** | ❌ Sama untuk semua user | ✅ Berbeda per user |
| **Perlu login?** | ❌ Public | ✅ Protected (JWT) |
| **Contoh isi** | Judul, perusahaan, lokasi, requirement, `external_url` | Match score, skill match, skill gap, AI insight |
 
Keduanya bisa ditampilkan **bersama** di halaman detail lowongan — FE cukup hit dua endpoint dan gabungkan hasilnya — tapi tetap dari dua endpoint yang berbeda.
 
---

## 11. Keterkaitan Endpoint dengan Tabel DB
 
| Endpoint | Tabel yang Terlibat |
|---|---|
| `POST /public/cv/upload` | — *(tidak ada, diproses di memory)* |
| `POST /cv/analyze` | `cv_archives`, `cv_skills`, `analysis_history`, `analysis_details` |
| `GET /cv/status/:task_id` | `cv_archives` (kolom `status`) |
| `GET /jobs` | `jobs`, `job_skills`, `skills` |
| `GET /jobs/:id` | `jobs`, `job_skills`, `skills` |
| `GET /jobs/recommendations` | `analysis_history`, `jobs` |
| `GET /analysis/history` | `analysis_history` |
| `GET /analysis/:id` | `analysis_history`, `analysis_details`, `skills` |
| `GET /user/profile` | `users` |

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

Protected route menggunakan middleware JWT verification di Express.

---

## 13. Workflow Tim

### 🔷 Frontend (FE)
1. Slicing UI dari desain
2. Integrasi dengan mock API / Swagger docs
3. Implementasi auth Supabase di sisi client
4. State management
5. Polling status antrian AI

> FE **tidak perlu menunggu BE selesai** — bisa mulai dengan mock JSON dan endpoint contract dari Swagger.

---

### 🔷 Backend (BE)
Prioritas awal:
1. Auth middleware (JWT verification)
2. PDF Parser (PDF → `cv_text`)
3. Endpoint structure & Swagger docs
4. Queue system (BullMQ + Redis)
5. Integrasi Supabase Storage & DB
6. Integrasi AI API

---

### 🟣 AI Engineer
Prioritas awal:
1. Preprocessing pipeline (`cv_text` → cleaned text)
2. Implementasi SBERT untuk similarity scoring
3. Skill extraction (NER atau Gen AI — masih dikaji)
4. Bangun FastAPI service
5. Definisikan schema response (JSON output)

---

### 🟢 Data Scientist (DS)
Prioritas awal:
1. Cleaning dataset hasil scraping
2. Standarisasi dan mapping skill
3. Populasi tabel `jobs`, `skills`, `job_skills`
4. Quality control data

---

## 14. Kesimpulan Final

### Keputusan-Keputusan yang Telah Disepakati

| Topik | Keputusan |
|---|---|
| Integrasi AI | FastAPI terpisah, bukan tensorflow.js di client |
| Input ke AI | `cv_text` (plain text), bukan PDF mentah |
| Proses analisis | **Asynchronous / Queue** (BullMQ + Redis) |
| Display rekomendasi | **Top-20 jobs** (bukan threshold >70%) |
| Master skill | Dipisah ke tabel `skills` tersendiri |
| Pendidikan & pengalaman | Di-compare secara teks, tanpa tabel master |
| Data tersimpan | `raw_text`, `cv_skills`, `analysis_history`, `analysis_details` |
| Auth | Supabase Auth + JWT verification di BE |
| Swagger | Digunakan sebagai kontrak FE ↔ BE |

### Flow Akhir Sistem

```
User Upload CV
     ↓
Backend: Parsing PDF → cv_text
     ↓
Backend: Hard Filtering Jobs (gender, umur, lokasi, pendidikan)
     ↓
Masuk Queue (BullMQ + Redis)
     ↓
Worker: Panggil AI API dengan cv_text + filtered_jobs
     ↓
AI: Preprocessing → Ekstraksi Skill → SBERT Scoring → Skill Gap
     ↓
Backend: Simpan hasil ke DB (cv_skills, analysis_history, analysis_details)
     ↓
Frontend: Polling status → Tampilkan Top-20 Rekomendasi + Detail Analisis
```

---

*Dokumen ini disusun berdasarkan hasil diskusi tim ITCareerMatch di Discord. Apabila ada perubahan keputusan, harap update dokumen ini agar seluruh tim tetap sinkron.*
