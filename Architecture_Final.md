# 📄 Arsitektur Final ITCareerMatch

> **CC26-PSU088** | Revisi v4 | Disesuaikan dengan implementasi kode terakhir, worker, queue, AI Railway, dan timestamp Supabase

## Ringkasan Keputusan Final

- Backend utama memakai Node.js + Express (ES Modules).
- AI SBERT berada di Railway dan diakses lewat endpoint internal AI.
- Guest preview tidak menyimpan ke database permanen; hasil hanya disimpan sementara di Redis.
- Full analysis untuk user login diproses async lewat BullMQ + Redis.
- PDF wajib diparsing dulu menjadi `cv_text` sebelum dikirim ke AI.
- Backend hanya mengirim lowongan yang sudah lolos filter dasar supaya AI tidak overload.
- Rekomendasi job sekarang wajib dipilih per `cv_id` agar hasil tidak tercampur antar CV milik user yang sama.
- Delete CV dan delete akun akan ikut membersihkan data turunan yang terkait, termasuk storage file dan tabel analisis.
- Timestamp di Supabase saat ini mengikuti UTC dan kolom waktu masih `timestamp without time zone`, jadi tampilan WIB perlu konversi saat baca.

## 1. Stack Sistem

| Komponen                  | Teknologi                                     |
| ------------------------- | --------------------------------------------- |
| Frontend                  | React                                         |
| Backend                   | Express.js                                    |
| Queue                     | BullMQ                                        |
| Cache / Session Sementara | Redis                                         |
| Database / Auth / Storage | Supabase PostgreSQL + Supabase Auth + Storage |
| AI Service                | SBERT service di Railway                      |

## 2. Alur Besar Sistem

### Guest preview

```
Frontend
  -> POST /api/v1/cv/preview
Backend
  -> parsing PDF / convert form manual menjadi cv_text
  -> validasi ATS
  -> quick score lokal (tanpa AI remote)
  -> simpan session sementara ke Redis (TTL 30 menit)
  -> return temp_token + preview
```

### User login / full analysis

```
Frontend
  -> POST /api/v1/cv/analyze atau POST /api/v1/cv/claim
Backend
  -> parsing PDF / convert form manual menjadi cv_text
  -> simpan cv_archives ke Supabase
  -> enqueue task ke BullMQ
Worker
  -> ambil cv_text + user profile + filtered_jobs
  -> kirim batch ke AI Service /internal/ai/match
AI Service
  -> ekstraksi skill + scoring + skill_match / skill_gap + ai_insight
Backend
  -> simpan cv_skills, analysis_history, analysis_details
Frontend
  -> polling GET /api/v1/cv/status/:task_id sampai completed
```

### Detail lowongan / gap skill

```
Backend internal / worker
  -> panggil endpoint internal backend /api/v1/cv/analyze-single
Backend
  -> kirim cv_text + job ke AI Service /internal/ai/analyze-single
  -> return analysis detail ke backend/worker yang memanggilnya
```

## 3. Peran Tiap Komponen

### Backend

- Verifikasi JWT Supabase untuk route protected.
- Terima upload PDF atau input manual CV.
- Parsing PDF menjadi teks.
- Convert form manual menjadi teks terstruktur.
- Validasi ATS.
- Filter lowongan sebelum dikirim ke AI.
- Simpan data permanen ke Supabase.
- Kirim task ke queue.
- Sediakan endpoint polling status.
- Jadi jembatan antara frontend, worker, dan AI service.

### Worker

- Konsumsi job dari `aiQueue`.
- Panggil `processJobToAi`.
- Menjalankan batch matching ke AI service.
- Menulis hasil ke database.
- Mengubah status `cv_archives` menjadi `completed` atau `failed` setelah proses selesai.

### AI Service

- Menerima `cv_text` saja, bukan PDF mentah.
- Batch endpoint untuk top-20 rekomendasi.
- Single endpoint untuk skill gap detail.
- Mengembalikan `extracted_skills`, `recommendations`, `skill_match`, `skill_gap`, dan `ai_insight`.

### Supabase

- Menyimpan user, CV archive, skill, hasil analisis, dan storage file PDF.
- Auth diverifikasi lewat Supabase JWT.
- Storage CV berada di bucket `cv-uploads`, avatar di bucket `avatars`.

## 4. Struktur Data yang Dipakai

### Tabel utama

- `users`
- `jobs`
- `skills`
- `job_skills`
- `cv_archives`
- `cv_skills`
- `analysis_history`
- `analysis_details`

### Fungsi tabel

- `cv_archives`: menyimpan raw text hasil parsing PDF atau input manual.
- `cv_skills`: menyimpan skill yang diekstrak dari CV beserta confidence.
- `analysis_history`: menyimpan hasil rekomendasi per job.
- `analysis_details`: menyimpan skill match / gap per analisis.
- `jobs` dan `job_skills`: sumber lowongan dan skill lowongan.
- `skills`: master skill untuk standarisasi nama skill.

## 5. Timestamp dan WIB

Hasil cek database saat ini:

- Timezone PostgreSQL di Supabase: `UTC`
- Kolom waktu yang dipakai: `timestamp without time zone`

Artinya:

- Nilai waktu yang disimpan bersifat naive timestamp.
- Saat dilihat langsung, jam bisa berbeda dari WIB.
- Ini bukan berarti data salah simpan; ini masalah representasi waktu.

Keputusan final:

- Penyimpanan tetap memakai setting database yang ada.
- Tampilan untuk user Indonesia harus dikonversi ke `Asia/Jakarta` saat query atau saat render di frontend.

Contoh query untuk laporan WIB:

```sql
SELECT
  uploaded_at,
  to_char(timezone('Asia/Jakarta', uploaded_at), 'YYYY-MM-DD HH24:MI:SS') AS uploaded_at_wib
FROM cv_archives
ORDER BY uploaded_at DESC
LIMIT 10;
```

Kenapa tidak langsung memakai `ALTER DATABASE postgres SET timezone TO 'Asia/Jakarta';`?

- Bisa dilakukan, tetapi tidak menyelesaikan masalah lama secara penuh karena kolom yang dipakai masih `timestamp without time zone`.
- Perubahan timezone database saja tidak mengubah data historis yang sudah tersimpan.
- Aplikasi tetap perlu konsisten saat baca/tampil waktu.
- Untuk sistem ini, konversi saat baca lebih aman dan lebih jelas.

Kalau nanti ingin migrasi penuh ke timezone-aware, langkah yang lebih benar adalah pindah ke `timestamptz` dan meninjau seluruh query/tampilan waktu.

## 6. Endpoint yang Benar-benar Dipakai

### Public

- `POST /api/v1/cv/preview`
- `GET /api/v1/jobs`
- `GET /api/v1/jobs/:id`

### Protected

- `POST /api/v1/cv/analyze`
- `POST /api/v1/cv/claim`
- `GET /api/v1/cv/archives`
- `DELETE /api/v1/cv/archives/:id`
- `GET /api/v1/cv/status/:task_id`
- `GET /api/v1/jobs/recommendations?cv_id=...`
- `GET /api/v1/analysis/history`
- `GET /api/v1/analysis/:id`
- `DELETE /api/v1/user/profile`

### Internal backend

- `POST /api/v1/cv/analyze-single` untuk kebutuhan internal backend saja, dipakai service backend/worker sebagai helper atau fallback detail skill
- `POST /internal/ai/match` untuk trigger internal backend yang memasukkan job ke queue BullMQ

### Internal AI service di Railway

- `POST /internal/ai/match` untuk proses matching AI batch yang dipanggil worker backend
- `POST /internal/ai/analyze-single` untuk proses gap analysis satu job

## 7. Contract AI yang Final

### Batch

Request dari backend:

```json
{
  "user_id": "uuid-user-123",
  "cv_id": "uuid-cv-456",
  "cv_text": "Teks mentah hasil parsing PDF CV user...",
  "filtered_jobs": [
    {
      "job_id": "job-001",
      "title": "Backend Dev",
      "company_name": "PT Tech",
      "description": "Requirement: Node.js, SQL, Docker..."
    }
  ]
}
```

Response dari AI:

```json
{
  "cv_id": "uuid-cv-456",
  "user_id": "uuid-user-123",
  "extracted_skills": ["Node.js", "SQL"],
  "recommendations": [
    {
      "job_id": "job-001",
      "job_title": "Backend Dev",
      "company": "PT Tech",
      "match_score": 85.5,
      "skill_match": ["Node.js", "SQL"],
      "skill_gap": ["Docker"],
      "ai_insight": "Profil Anda cocok. Anda sudah menguasai Node.js dan SQL. Pertimbangkan Docker untuk meningkatkan peluang lolos."
    }
  ]
}
```

### Single

Request dari backend:

```json
{
  "cv_text": "Teks mentah hasil parsing PDF CV user...",
  "job": {
    "job_id": "job-001",
    "title": "Backend Dev",
    "company_name": "PT Tech",
    "description": "Requirement: Node.js, SQL, Docker..."
  }
}
```

Response dari AI:

```json
{
  "extracted_skills": ["Node.js", "SQL"],
  "analysis": {
    "job_id": "job-001",
    "job_title": "Backend Dev",
    "company": "PT Tech",
    "match_score": 85.5,
    "skill_match": ["Node.js", "SQL"],
    "skill_gap": ["Docker"],
    "ai_insight": "Profil Anda sangat cocok. Anda sudah menguasai Node.js, SQL. Pertimbangkan untuk mempelajari Docker untuk peluang lolos yang lebih besar."
  }
}
```

## 8. Data yang Disimpan Permanen

- `cv_archives`: raw text, file URL, nama file, sumber CV, status.
- `cv_skills`: skill hasil ekstraksi AI dan confidence.
- `analysis_history`: rekomendasi per job untuk user tersebut.
- `analysis_details`: skill match / gap per rekomendasi.

Untuk guest preview:

- tidak ada simpan permanen.
- hanya Redis dengan TTL 30 menit.

## 9. Catatan Implementasi Penting

- Guest preview saat ini memakai quick scoring lokal, bukan panggilan AI penuh.
- Full analysis baru masuk queue dan memanggil AI service.
- Backend hanya mengirim maksimal 20 lowongan yang lolos filter dasar.
- Deskripsi lowongan dipotong supaya payload lebih ringan.
- Jika AI tidak mengirim detail skill, backend masih punya fallback analisis detail pada top N.
- Fallback detail skill memakai `analyze-single` dengan data job lengkap dari database jika batch response tidak membawa skill detail.

## 10. Kesimpulan Final

Flow yang dianggap final saat ini:

1. Guest preview untuk cek cepat CV.
2. User login lalu claim session atau langsung upload untuk full analysis.
3. Backend filter lowongan.
4. Worker kirim batch ke AI service.
5. AI mengembalikan rekomendasi + detail skill.
6. Backend simpan ke Supabase.
7. Frontend tampilkan rekomendasi dan detail analisis.

## 11. Flow End-to-End yang Dipakai Saat Ini

### A. Guest preview

1. Guest upload PDF atau isi form manual.
2. Backend parsing PDF atau convert form ke `cv_text`.
3. Backend validasi ATS.
4. Backend membuat preview lokal tanpa memanggil AI remote untuk job matching.
5. Hasil preview disimpan sementara di Redis selama 30 menit.
6. Backend mengembalikan `temp_token` ke frontend.

### B. Claim session

1. User login.
2. Frontend mengirim `temp_token` ke `POST /api/v1/cv/claim`.
3. Backend mengambil data preview dari Redis.
4. Backend menyimpan CV ke `cv_archives`.
5. Backend enqueue task ke BullMQ.
6. Worker memproses batch AI.

### C. Full analysis user login

1. User upload CV lewat `POST /api/v1/cv/analyze` atau claim preview.
2. Backend menyimpan file dan teks CV ke database.
3. Backend melakukan hard filter lowongan.
4. Worker mengirim `cv_text` dan `filtered_jobs` ke AI Railway.
5. AI mengembalikan `extracted_skills` dan `recommendations`.
6. Backend menyimpan `cv_skills`, `analysis_history`, dan `analysis_details`.
7. Frontend polling `GET /api/v1/cv/status/:task_id` sampai selesai.

### D. Detail lowongan

1. User klik detail lowongan di frontend.
2. Jika backend perlu analisis gap skill satu lowongan, service backend memanggil `POST /api/v1/cv/analyze-single` secara internal.
3. Endpoint internal backend memvalidasi `cv_text` dan `job`, lalu meneruskan payload ke AI Railway lewat `POST /internal/ai/analyze-single`.
4. AI mengembalikan `skill_match`, `skill_gap`, `ai_insight`, dan `match_score`.
5. Backend meneruskan hasil itu ke caller internal yang meminta analisis detail.

### E. Daftar dan hapus CV

1. Frontend memanggil `GET /api/v1/cv/archives` untuk mengambil daftar CV user.
2. User memilih satu `cv_id` untuk konteks rekomendasi.
3. Frontend memanggil `GET /api/v1/jobs/recommendations?cv_id=<uuid>`.
4. Jika user menghapus CV, backend menghapus file di bucket `cv-uploads`, lalu membersihkan `cv_skills`, `analysis_history`, `analysis_details`, dan `cv_archives`.

### F. Hapus akun

1. User menghapus akun dari endpoint delete profile.
2. Backend menghapus avatar di bucket `avatars`.
3. Backend menghapus semua file CV user di storage.
4. Backend membersihkan job queue/task Redis yang masih terkait user tersebut.
5. Backend menghapus semua data CV dan analisis milik user, lalu menghapus user dari Supabase Auth dan tabel `users`.

## 12. Keterkaitan Endpoint dengan Data

| Endpoint                           | Data / Storage                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `POST /api/v1/cv/preview`          | Redis session sementara                                                                     |
| `POST /api/v1/cv/analyze`          | `cv_archives`, queue, lalu `cv_skills`, `analysis_history`, `analysis_details`              |
| `POST /api/v1/cv/claim`            | Redis, `cv_archives`, queue, lalu hasil analisis permanen                                   |
| `GET /api/v1/cv/archives`          | `cv_archives`                                                                               |
| `DELETE /api/v1/cv/archives/:id`   | `cv_archives`, `cv_skills`, `analysis_history`, `analysis_details`, storage                 |
| `GET /api/v1/cv/status/:task_id`   | Redis task status                                                                           |
| `GET /api/v1/jobs`                 | `jobs`, `job_skills`, `skills`                                                              |
| `GET /api/v1/jobs/:id`             | `jobs`, `job_skills`, `skills`                                                              |
| `GET /api/v1/jobs/recommendations` | `analysis_history`, `analysis_details`, `jobs` (per `cv_id`)                                |
| `GET /api/v1/analysis/history`     | `analysis_history`                                                                          |
| `GET /api/v1/analysis/:id`         | `analysis_history`, `analysis_details`, `skills`                                            |
| `GET /api/v1/user/profile`         | `users`                                                                                     |
| `DELETE /api/v1/user/profile`      | `users`, `cv_archives`, `cv_skills`, `analysis_history`, `analysis_details`, storage, queue |
| `POST /api/v1/cv/analyze-single`   | Internal backend only; helper/fallback untuk gap skill satu job, lalu proxy ke AI Railway   |

## 13. Authentication dan Security

- User login memakai Supabase Auth.
- Backend memverifikasi JWT lewat middleware `authenticate`.
- Route protected tidak boleh dipanggil tanpa access token user.
- Route internal backend diproteksi dengan `internalOnly`.
- Backend mengirim header internal ke AI service agar request tidak dibuka ke publik.
- Path `/internal/ai/match` ada di backend dan AI service, tetapi fungsinya berbeda: backend untuk enqueue job, AI service untuk eksekusi matching.
- Guest flow tidak memakai JWT, hanya `temp_token` sementara dari Redis.

## 14. Workflow Tim

### Backend Engineer

- Parsing PDF.
- Konversi form manual.
- Validasi ATS.
- Filtering jobs.
- Queue dan worker orchestration.
- Simpan hasil ke Supabase.

### AI Engineer

- SBERT matching.
- Ekstraksi skill.
- Skill gap analysis.
- Return response dengan `skill_match`, `skill_gap`, `ai_insight`.

### Data Scientist

- Kurasi data job.
- Standarisasi skill.
- Menjaga kualitas data master job dan skill.

### Frontend

- Preview guest.
- Claim setelah login.
- Polling task status.
- Tampilkan top-20 rekomendasi dan detail skill gap.

## 15. Catatan Implementasi yang Sering Menjebak

- Preview guest tidak menyimpan ke database permanen.
- Full analysis tidak sinkron; diproses lewat queue.
- Job matching hanya untuk job yang sudah lolos filter dasar.
- `analysis_details` hanya terisi jika AI mengirim skill detail.
- Waktu di Supabase default terbaca UTC, bukan WIB.
- Untuk tampil WIB, konversi saat baca, bukan mengandalkan timezone database saja.

_Dokumen ini harus dipakai sebagai acuan utama. Kalau ada perubahan route, payload AI, atau struktur tabel, dokumen ini perlu diupdate lagi supaya seluruh flow tetap sinkron._
